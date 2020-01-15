const cypher = function(input) {
    let buff = new Buffer(input);  
    let base64 = buff.toString('base64');
    return Array.from(base64).map(f => process.env.CYPHER_ENCODING[process.env.CYPHER_ALPHABET.indexOf(f)]).join('');
}

const decypher = function(input) {
    let base64 = Array.from(input).map(f => process.env.CYPHER_ALPHABET[process.env.CYPHER_ENCODING.indexOf(f)]).join('');
    let buff = new Buffer(base64, 'base64');  
    return buff.toString('ascii');
}

module.exports = {    
    decypher,
    cypher
}
