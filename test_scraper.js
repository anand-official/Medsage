const scraper = require('./server/services/syllabusScraper');

async function run() {
    try {
        console.log("Testing syllabus scraper...");
        const res = await scraper.getCurriculum('India', 1);
        console.log("Result:");
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
