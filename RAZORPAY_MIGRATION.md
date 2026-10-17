The frontend now calls POST /api/v1/razorpay/create-order?NEWJOIN=true for
enrollment and NEWJOIN=false for installments, with Bearer authentication.
The request contains REGNO, GROUPCODE, AMOUNT in rupees, and NMDATA or
SCHEMEDETAILS. Checkout uses the returned public key, order_id and amount
in paise. Its three signature fields go to /razorpay/verify-payment.

The backend stores the member/collection payload and applies it after payment
capture. Online frontend flows and recovery no longer call member/create or
account/insert. Cash retains the existing direct insert flow.

Rebuild Android with `npx expo run:android` (or your release build pipeline).
The added react-native-razorpay native dependency cannot be delivered by an
OTA JavaScript update or used in Expo Go. iOS needs a native rebuild with pods.

For this Windows machine, use JDK 17 in the build terminal:
`$env:JAVA_HOME='C:\Program Files\Java\jdk-17'` then
`npx.cmd expo run:android --no-bundler` when Metro is already running.
android/local.properties specifies the installed SDK location (machine-local).
The Android repositories include Notifee's bundled Maven library.
The payment SDK check now verifies RNRazorpayCheckout's native module before
creating an order, so an outdated app binary fails at step 02 without creating
another pending payment.

Deployment requirements from the supplied backend:
- Deploy the Razorpay controller/service and configure the active gateway row.
- Configure signed payment.captured/payment.failed webhooks at
  https://scheme.bmgjewellers.com/api/v1/razorpay/webhook.
- Ensure login JWTs include contact. RazorpayController now reads the contact
  returned by JwtService and falls back to NMDATA.newMember.mobile for joins.
  Restart/redeploy the backend to pick up this controller fix.
- create-order does not return its generated receipt, and the controller has no
  order-ID status endpoint. Recovery can retry persisted checkout signatures;
  if the app dies before receiving them, crediting relies on the webhook.
- PAYMENT_SUCCESS can coexist with a failed or unfinished processResult.
  The frontend shows creditPending until the backend reports a completed result.

Validation: `node scripts/payment-flow.test.cjs`, TypeScript checking, and
Android Metro export. Real checkout, UPI return, webhook delivery and database
crediting still require a rebuilt device app and Razorpay test credentials.
