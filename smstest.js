const axios = require("axios");

axios.post("https://im.smsclub.mobi/sms/send", {
  src_addr: "Zamovlennia",
  phone: ["380509032376"],
  text: "Тест нового API",
  other: ""
}, {
  headers: {
    "Authorization": "Bearer W4aZXL3TI-abh-M...(повний токен)",
    "Content-Type": "application/json"
  }
})
.then(res => console.log("SUCCESS:", res.data))
.catch(err => console.log("ERROR:", err.response?.data || err.message));
