
const util = require('util');
const exec = util.promisify(require('child_process').exec);


(async () =>{
    console.log('Running pre-checks...');
    if (!process.cwd().endsWith('/befake') && !process.cwd().endsWith('/be-real-plus')){
        console.log("\x1b[41m%s\x1b[0m", 'Error: Please run this commmand from the befake root directory.');
        return;
    }
    console.log('Pre-Checks Successful');

    console.log("\x1b[43m%s\x1b[0m", 'Building...');
    await exec('node build --prod');
    console.log("\x1b[42m%s\x1b[0m", 'Build Successful');
    console.log("\x1b[43m%s\x1b[0m", 'Deploying...');

    const {stderrAdd} = await exec(`git add .`);
    const {stderrCommit} = await exec(`git commit -m "${process.argv[2]||'BeFake Update'}"`);
    const {stderrPush} = await exec(`git push origin main`);
    if (stderrAdd||stderrCommit||stderrPush){
        console.log("\x1b[40m%s\x1b[0m", 'Error: The deploy was unsuccessful. Please see the above logs.');
    }
    console.log("\x1b[42m%s\x1b[0m", 'Deploy Successful');
})();