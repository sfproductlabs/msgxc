const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const httpCodes = require('./httpStatusCodes')

const createStripeCustomer = async (user) => {
  return new Promise(function (resolve, reject) {
    //TODO: AG First check DB
    stripe.customers.create({
      description: user.uname,
      email: user.email,
      phone: user.cell,
      metadata: {
        uname: user.uname,
        uid: user.id,
        ip: user.ip
      }
    }, function (err, customer) {
      // asynchronously called
      if (err || !customer) {
        console.warn(err);
        reject({
          code: httpCodes.BAD_REQUEST,
          msg: 'Failed to generate stripe customer'
        });
      } else {
        resolve(customer);
      }
    });
  });
}

const createStripeSource = async (stripeCustomerId, card) => {
  return new Promise(function (resolve, reject) {
    if (card && card.number && card.exp_month && card.exp_year && card.cvc) {
      //TODO: AG First try and get last customer
      stripe.tokens.create({
        card
      }, function (err, token) {
        // asynchronously called
        if (err || !token) {
          console.warn(err);
          reject({
            code: httpCodes.BAD_REQUEST,
            msg: 'Failed to generate stripe token'
          });
        }
        stripe.customers.createSource(
          stripeCustomerId, {
            source: token.id,
          },
          function (err, source) {
            // asynchronously called
            if (err || !source) {
              console.warn(err);
              reject({
                code: httpCodes.BAD_REQUEST,
                msg: 'Failed to generate stripe source'
              });
            }
            resolve({
              token,
              source
            });
          }
        );

      });
    } else {
      console.warn('MISSING CARD INFO');
      reject({
        code: httpCodes.BAD_REQUEST,
        msg: 'Missing card info'
      });
    }
  });
}

const chargeStripe = async (customer, card, amount, currency, ref) => {
  return new Promise(function (resolve, reject) {
      stripe.charges.create({
        amount: amount,
        currency: currency,
        source: card, // obtained with Stripe.js
        description: ref,
        customer: customer
      }, function (err, charge) {
        if (err) {
          console.warn(err);
          reject({
            code: httpCodes.BAD_REQUEST,
            msg: 'Missing card info'
          });    
        } else {
          resolve(charge);
        }
      });

  });
}





module.exports = {
  createStripeCustomer,
  createStripeSource,
  chargeStripe,
  stripe
};