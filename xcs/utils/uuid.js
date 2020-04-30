const uuidVersion = function(uuid_str) { 
    var uuid_arr = uuid_str.split( '-' );
 var timeHiAndVersion = parseInt(uuid_arr[ 2 ], 16); 
 var version = (timeHiAndVersion >> 12) & 0xF; 
 return version; 
}

const uuidTime = function (uuid_str) {
    var uuid_arr = uuid_str.split( '-' ),
        time_str = [
            uuid_arr[ 2 ].substring( 1 ),
            uuid_arr[ 1 ],
            uuid_arr[ 0 ]
        ].join( '' );
    return parseInt( time_str, 16 );
};

const uuidDate = function (uuid_str) {
    if (uuidVersion(uuid_str) != 1) return null;
    var int_time = uuidTime( uuid_str ) - 122192928000000000, int_millisec = Math.floor( int_time / 10000 );
    return new Date( int_millisec );
};

const uuidTicks = function (uuid_str) {
    const date = uuidDate(uuid_str);
    return (date) ? date.getTime() : null;
}

const uuidWithin = function(uuid_str, millis) {
    const ticks = uuidTicks(uuid_str);
    if (!ticks) return false;
    if (ticks + millis > Date.now()) 
        return true;
    else 
        return false;
}

module.exports = {
    uuidDate,
    uuidTicks,
    uuidVersion,
    uuidWithin
}