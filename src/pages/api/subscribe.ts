import { NextApiRequest, NextApiResponse } from 'next'
import { query as q } from 'faunadb'
import { getSession } from 'next-auth/react'
import { stripe } from '../../services/stripe'
import { fauna } from '@/src/services/fauna'

type User = {
  ref: {
    id: string
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const session = await getSession({ req })

    const user = await fauna.query<User>(
      q.Get(
        q.Match(
          q.Index('users_by_email'),
          q.Casefold(session.user.email)
        )
      )
    )

    let customerId = user.data.stripe_customer_id

    if (!customerId) {
      const stripeCustumer = await stripe.customers.create({
        email: session.user.email
      })

      await fauna.query(
        q.Update(
          q.Ref(q.Collection('users'), user.ref.id),
          {
            data: {
              stripe_customer_id: stripeCustumer.id
            }
          }
        )
      )

      customerId = stripeCustumer.id
    }

    const stripeCheckoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      line_items: [
        { price: 'price_1Mu6xgIV9vBq54dBjU0iA22Y', quantity: 1 }
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: process.env.STRIPE_SUCCESS_URL!,
      cancel_url: process.env.STRIPE_SUCCESS_URL
    })

    return res.status(200).json({ sessionI: stripeCheckoutSession.id })
  } else {
    res.setHeader('allow', 'POST')
    res.status(405).end('Method not allowed')
  }
}