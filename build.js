const DEV_MODE = !process.argv.includes('--prod');
const fs = require('fs').promises;
var JavaScriptObfuscator = require('javascript-obfuscator');

const MAX_OBF = {
	// domainLock: [],
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false,
    // disableConsoleOutput: true,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'dictionary',
    identifiersDictionary: ['hire_me', 'bereal_please_hire', 'give_me_a_job', 'pleaseandthanks', 'befake', 'fakest', 'real', 'realest'],
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    rotateStringArray: true,
    selfDefending: true,
    shuffleStringArray: true,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 4,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
    unicodeEscapeSequence: false
};

(async () => {
    if (DEV_MODE) console.log("\x1b[43m%s\x1b[0m", 'This is a dev build. To build for production, run node deploy.');
    let files = {};
    let fileNames = await fs.readdir('client/js');
    for (let fileName of fileNames) {
        let content = await fs.readFile('client/js/' + fileName, 'utf-8');
        files[fileName] = content;
    }
    let newContent = JavaScriptObfuscator.obfuscateMultiple(files, MAX_OBF);
    for (let fileName of fileNames) {
        let content = DEV_MODE ? files[fileName] : newContent[fileName].getObfuscatedCode();
        await fs.writeFile('public/js/' + fileName, content);
        console.log('\x1b[36m%s\x1b[0m', `* Patched ${fileName}`);
    }
    console.log("\x1b[42m%s\x1b[0m", 'Build Successful');

   
})();