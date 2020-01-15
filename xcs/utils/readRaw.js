/* Helper function for reading a posted RAW body */
function readRaw(res, cb, err) {
  try {
    let buffer;
    /* Register data cb */
    res.onData((ab, isLast) => {
      let chunk = Buffer.from(ab);
      if (isLast) {
        let raw;
        if (buffer) {
          try {
            raw = Buffer.concat([buffer, chunk]);
          } catch (e) {
            /* res.close calls onAborted */
            res.close();
            return;
          }
          cb(raw);
          return;
        } else {
          try {
            raw = chunk;
          } catch (e) {
            /* res.close calls onAborted */
            res.close();
            return;
          }
          cb(raw);
          return;
        }
      } else {
        if (buffer) {
          buffer = Buffer.concat([buffer, chunk]);
        } else {
          buffer = Buffer.concat([chunk]);
        }
      }
    });
  } catch (ex) {
    err(ex)
  }
}

module.exports = readRaw;