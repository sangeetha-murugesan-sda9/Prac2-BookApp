// this JWT_SECRET being a hardcoded string literal is CWE-798 (hardcoded
// credentials) - CodeQL's js/hardcoded-credentials query flags this. it's
// a different vulnerability *class* 

//const JWT_SECRET = process.env.JWT_SECRET;
const JWT_SECRET = 'devops-demo-secret-2026';
module.exports = { JWT_SECRET };
