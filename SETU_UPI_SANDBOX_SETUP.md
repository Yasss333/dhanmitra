# Setu UPI Sandbox setup

1. Create a **UPI Deep Links** merchant configuration in [Setu Bridge Sandbox](https://docs.setu.co/payments/upi-deeplinks/quickstart). Copy its Merchant ID (the Product Instance ID).
2. In Bridge Organization Settings, create an OAuth key scoped to this sandbox product. Copy the `clientID` and `secret` immediately.
3. Copy [`backend copy/.env.example`](backend%20copy/.env.example) to `backend copy/.env`, then fill `SETU_CLIENT_ID`, `SETU_CLIENT_SECRET`, and `SETU_PRODUCT_INSTANCE_ID`. Do not add this file to Git.
4. Expose the backend with a public HTTPS tunnel while testing webhooks. In the Bridge configuration, set the callback URL to `https://your-public-host/api/payments/webhook/setu`. Setu appends `/notifications`, which is handled by this app.
5. Start the API from `backend copy` using your existing FastAPI command, and start the Vite client from `frontend` with `npm run dev`.
6. Sign in, complete onboarding, then open **UPI Sandbox** in the sidebar. Create a test link. **Mock payment** calls Setu's sandbox-only `addCredit` trigger; it never transfers actual money.

The API uses OAuth access tokens with an in-memory expiry cache, sends the required `X-Setu-Product-Instance-ID` header, and keeps all Setu secrets on the server. Sandbox and production use separate credentials; do not change `SETU_ENVIRONMENT` to `production` until the production configuration has been approved and tested.
