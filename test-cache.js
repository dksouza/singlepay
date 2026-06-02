const url = "http://localhost:3000/pay/xH55LWzw";
fetch(url).then(res => res.text()).then(html => {
  if(html.includes("Stripe)")) console.log("Stripe error");
  if(html.includes("CajuPay)")) console.log("CajuPay error");
}).catch(console.error);
