const pdf = require('pdf-parse');
const fs = require('fs');

async function test() {
    try {
        const buf = fs.readFileSync('../Syllabus - MBBS.pdf');
        const data = await pdf(buf);
        console.log("Success, text length:", data.text.length);
    } catch (e) {
        console.error(e);
    }
}
test();
