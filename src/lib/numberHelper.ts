/**
 * Check if a value is a number or a string that can be converted to a number.
 * @param {any} value - The value to check.
 * @returns {boolean} - True if the value is a number or a string that can be converted to a number, false otherwise.
 */
export const isNumeric = (value: any) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 return {false}
 An empty string ''
 The special value NaN
 undefined
 null
 An array []
 A non-numeric string like 'blah' or '1e3a'
 An object like {}
 A boolean value true or false

 In all other cases, the function returns true

 Test cases and expected outputs
 isNumeric('')                  // false
 isNumeric('   ')               // false
 isNumeric('blah')              // false
 isNumeric(NaN)                 // false
 isNumeric(undefined)           // false
 isNumeric(null)                // false
 isNumeric([])                  // false
 isNumeric('1.2.3')             // false
 isNumeric({})                  // false
 isNumeric(true)                // false
 isNumeric('0x')                // false
 isNumeric('0xg')               // false
 isNumeric('0x1234g')           // false
 isNumeric('-1.2e')             // false

 isNumeric('1e3')               // true
 isNumeric('3.14')              // true
 isNumeric('-42')               // true
 isNumeric('0xFF')              // true
 isNumeric(0)                   // true
 isNumeric(1000000)             // true
 isNumeric('-0')                // true
 isNumeric('+42')               // true
 isNumeric('-42  ')             // true
 isNumeric('1234567890123')     // true
 isNumeric('9.999999999999')    // true
 isNumeric('1/3')               // true
 isNumeric('0.0000000000001')   // true
 isNumeric('1_000')             // true
 isNumeric('1_000.00')          // true
 isNumeric('-1_000')            // true
 isNumeric('-1_000.00')         // true
 isNumeric('1.7976931348623157E+308') // true
 isNumeric('-1.7976931348623157E+308') // true
 isNumeric('5e-324')            // true
 isNumeric('-5e-324')           // true
 isNumeric('1.2e+34')           // true
 isNumeric('1.2e-34')           // true
 isNumeric('-1.2e+34')          // true
 isNumeric('-1.2e-34')          // true
 isNumeric('-.2')               // true
 */
