import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { stripe } from '../../services/stripe'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const session = await getSession({ req })

    const stripeCostumer = await stripe.customers.create({ email: session.user.email })

    const stripeCheckoutSession = await stripe.checkout.sessions.create({
      costumer: stripeCostumer.id,
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