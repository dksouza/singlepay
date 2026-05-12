const Stripe = require('stripe');

try {
  const stripe = new Stripe(undefined, {
    apiVersion: '2023-10-16',
  });
  console.log("Stripe initialized");
} catch (e) {
  console.log("Error:", e.message);
}
