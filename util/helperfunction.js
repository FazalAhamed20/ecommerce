const calculateTotals = (cartItems) => {
  const totals = cartItems.reduce(
    (accumulator, item) => {
      let productPrice = 0;
      if (item.productId && typeof item.productId === "object") {
        productPrice =
          item.productId.productOfferprice ||
          item.productId.Offerprice ||
          item.productId.price ||
          0;
      } else {
        console.warn(`Invalid product data for item: ${JSON.stringify(item)}`);
      }
      const itemSubtotal = productPrice * item.quantity;
      accumulator.subtotal += itemSubtotal;
      return accumulator;
    },
    {
      subtotal: 0,
    }
  );

  // update totals
  const updatedTotals = {
    subtotal: totals.subtotal,
    tax: totals.subtotal * 0.05,
    shipping: 15.0,
    grandTotal: totals.subtotal + totals.subtotal * 0.05 + 15.0,
  };

  return updatedTotals;
};


function generateOrderID() {
  const safeIndex = Math.floor(Math.random() * 1000000);
  const sixDigitID = String(safeIndex + 1).padStart(6, "0");
  return "ORD#" + sixDigitID;
}
function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
function generateReferralCode() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let referralCode = "";
  for (let i = 0; i < 6; i++) {
    referralCode += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return referralCode;
}
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000);
}
function formatDate(date) {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayOfWeek = daysOfWeek[date.getDay()];
  const month = months[date.getMonth()];
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${dayOfWeek} ${month} ${day} ${year}`;
}
function formatDated(date) {
  if (!date) return null;

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

module.exports = {
  calculateTotals,
  formatDate,
  generateOrderID,
  getCurrentTime,
  generateReferralCode,
  generateOTP,
  formatDated

};
