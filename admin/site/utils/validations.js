const {defaultTo} = require('ramda');

const validateRequired = function(data) {
    data = defaultTo('')(data);
    const re = /\S/i;
    if(!re.test(data))
        return 'Required';
    else
        return null;
}

const validateRequiredImages = function(data) {
  if(data.length<1){
    return 'Image Required';
  }else{
    return null;
  }
}

const acceptedCreditCards = {
  visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
  mastercard: /^5[1-5][0-9]{14}$|^2(?:2(?:2[1-9]|[3-9][0-9])|[3-6][0-9][0-9]|7(?:[01][0-9]|20))[0-9]{12}$/,
  amex: /^3[47][0-9]{13}$/,
  discover: /^65[4-9][0-9]{13}|64[4-9][0-9]{13}|6011[0-9]{12}|(622(?:12[6-9]|1[3-9][0-9]|[2-8][0-9][0-9]|9[01][0-9]|92[0-5])[0-9]{10})$/,
  diners_club: /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/,
  jcb: /^(?:2131|1800|35[0-9]{3})[0-9]{11}$/
};



const validateCardNumber = function(value) {
  // remove all non digit characters
  var value = value.replace(/\D/g, '');
  var sum = 0;
  var shouldDouble = false;
  // loop through values starting at the rightmost side
  for (var i = value.length - 1; i >= 0; i--) {
    var digit = parseInt(value.charAt(i));

    if (shouldDouble) {
      if ((digit *= 2) > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  var valid = (sum % 10) == 0;
  var accepted = false;

  // loop through the keys (visa, mastercard, amex, etc.)
  Object.keys(acceptedCreditCards).forEach(function(key) {
    var regex = acceptedCreditCards[key];
    if (regex.test(value)) {
      accepted = true;
    }
  });

  if(valid && accepted){
    return null
  }else{
    return 'Card Invalid'
  }

}

const validateCardmonth = function(data) {
  // const re = /^[a-zA-Z0-9]+$/i;

  if(data.length<2 && data.length>0)
      return '2 digits';
  else
      return null;
}

const validateCardYear = function(data) {
  // const re = /^[a-zA-Z0-9]+$/i;

  if(data.length<4 && data.length>0){
      return '4 digits';
  }else if(Number(data)<2019){
    return 'Not valid.';
  }else{
    return null;
  }

}

const validateCardCVC = function(data) {
  // const re = /^[a-zA-Z0-9]+$/i;

  if(data.length<3 && data.length>0)
      return '3 digits';
  else
      return null;
}

const validateUuid = function(data) {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if(!re.test(data))
        return 'Invalid Id';
    else
        return null;
}

const validateUsername = function(data) {
  // const re = /^[a-zA-Z0-9]+$/i;
  const re = /^[a-zA-Z0-9\-\_\.]+$/i;

  if((!re.test(data)||data.length<3))
      return 'Invalid Username';
  else
      return null;
}

const validateEmail = function(data) {
    const re = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
    if(!re.test(data))
        return 'Invalid Email';
    else
        return null;
}

const validatePhone = function(data) {

  const re = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/i;

  if(!re.test(data) && data.length>0)
    return 'Invalid Phone Number';
  else
    return null;
}

const validateText = function(data) {
  // const re = /^\d{10}$/i;
  // const re = /^[a-zA-Z0-9\-\_\ \.]+$/i;
  const re = /^[\s\S]+$/i;
  if(!re.test(data) && data.length>0)
    return 'Invalid Characters';
  else
    return null;
}

const validateNumber = function(data) {
  const re = /^\d+$/;
  if(!re.test(data) && data!==null)
    return 'Only Numbers';
  else
    return null;
}

const validateLocation = function(data){
  if(data!==null){
    return null;
  }else{
    return 'Location Required';
  }
}

const validate = function(data, validations) {
    let errors = {};
    const re = /\S/i;
    Object.keys(validations).map(function(key,index){
        let toCheck = defaultTo('')(validations[key])
        errors[key] = [];
        // console.log(validations[key])
        if(re.test(toCheck)) {
            //Split validations and test each one, then add to error object
            let checkAll = validations[key].split(",");
            // console.log(checkAll)
            checkAll.map(function(v,i) {
                if (v.length > 0) {
                    let m = module.exports['validate' +  v[0].toUpperCase() + v.slice(1).toLowerCase()];
                    if(m(data[key])){
                      errors[key].push(m(data[key]));
                    }
                    // let errorstemp = (m(data[key]) || '') + (errors[key] || '');
                    // errors[key] = errorstemp.split(';');
                }
            });
        }

    });
    return errors;
}

const hasErrors = function(errors) {
    const re = /\S/i;
    let toReturn = false;
    Object.keys(errors).map(function(key,index){
        let toCheck = defaultTo('')(errors[key]);
        if(re.test(toCheck))
            toReturn = true;
    });
    return toReturn;
}

module.exports = {
    hasErrors,
    validateEmail,
    validatePhone,
    validateUsername,
    validateText,
    validateNumber,
    validateLocation,
    validateRequired,
    validateRequiredImages,
    validateCardNumber,
    validateCardmonth,
    validateCardYear,
    validateCardCVC,
    validateUuid,
    acceptedCreditCards,
    validate
}
