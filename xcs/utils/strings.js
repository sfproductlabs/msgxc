function ab2str (buffer, encoding) {
    // ab2str(uint8) // 'Hello World!'
    // ab2str(uint8, 'base64') // 'SGVsbG8gV29ybGQh'
    // ab2str(uint8, 'hex') // '48656c6c6f20576f726c6421'
    // ab2str(uint8, 'iso-8859-2') // 'Hello World!'
	if (encoding == null) encoding = 'utf8'
	return Buffer.from(buffer).toString(encoding)
}

// // source: http://stackoverflow.com/a/11058858
// function ab2str(buf) {
//     return String.fromCharCode.apply(null, new Uint16Array(buf));
// }

// // source: http://stackoverflow.com/a/11058858
// function str2ab(str) {
//     var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
//     var bufView = new Uint16Array(buf);
//     for (var i = 0, strLen = str.length; i < strLen; i++) {
//         bufView[i] = str.charCodeAt(i);
//     }
//     return buf;
// }

function str2uint(string) {
    var string = btoa(unescape(encodeURIComponent(string))),
        charList = string.split(''),
        uintArray = [];
    for (var i = 0; i < charList.length; i++) {
        uintArray.push(charList[i].charCodeAt(0));
    }
    return new Uint8Array(uintArray);
}

function uint2str(uintArray) {
    var encodedString = String.fromCharCode.apply(null, uintArray),
        decodedString = decodeURIComponent(escape(encodedString));
    return decodedString;
}

function ab2b64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

module.exports = {
    ab2str,
    //str2ab,
    uint2str,
    str2uint,
    ab2b64
}