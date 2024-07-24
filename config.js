const dotenv = require('dotenv');
dotenv.config();
const {
 PORT,
  POSTGRES_URL
} = process.env;
module.exports = {
 port: PORT,
  urlConnection: POSTGRES_URL
}