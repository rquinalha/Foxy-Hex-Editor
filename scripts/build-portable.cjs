const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { version, build } = require('../package.json');

const root = path.resolve(__dirname, '..');

function run(program, args) {
    const result = spawnSync(program, args, { cwd: root, stdio: 'inherit', windowsHide: true });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${path.basename(program)} retornou o código ${result.status}.`);
}

async function buildPortable() {
    if (process.platform !== 'win32') throw new Error('Execute o build portátil em um ambiente Windows.');

    const { NSIS_PATH, NsisTargetOptions } = require('app-builder-lib/out/targets/nsis/nsisUtil');
    NsisTargetOptions.resolve({});
    const compiler = path.join(await NSIS_PATH(), 'Bin', 'makensis.exe');
    const cli = require.resolve('electron-builder/out/cli/cli.js');
    const output = path.join(root, build.directories.output);
    fs.mkdirSync(output, { recursive: true });
    const outputRoot = fs.realpathSync(output);
    const temporary = fs.mkdtempSync(path.join(outputRoot, '.portable-build-'));
    const name = `FoxyHexEditor-${version}-portable.exe`;
    try {
        const args = [cli, '--win', '--x64', '--dir', '--publish=never',
            `--config.directories.output=${temporary}`, '--config.win.signAndEditExecutable=false'];
        if (process.arch === 'x64') {
            args.push(`--config.electronDist=${path.dirname(require('electron'))}`);
        }
        run(process.execPath, args);

        const payload = path.join(temporary, 'win-unpacked');
        const appExecutable = `${build.productName}.exe`;
        fs.accessSync(path.join(payload, appExecutable));
        const candidate = path.join(temporary, name);
        const numericVersion = `${version.split(/[+-]/, 1)[0]}.0`;
        run(compiler, [
            '/V2', `/DPORTABLE_OUTPUT=${candidate}`, `/DPORTABLE_PAYLOAD=${payload}`,
            `/DPORTABLE_APP_EXE=${appExecutable}`, `/DPORTABLE_VERSION=${numericVersion}`,
            `/DPORTABLE_ICON=${path.join(root, build.win.icon)}`, path.join(__dirname, 'portable-launcher.nsi')
        ]);

        const destination = path.join(outputRoot, name);
        fs.renameSync(candidate, destination);
        console.log(`Executável portátil gerado em ${destination}`);
    } finally {
        const resolved = fs.realpathSync(temporary);
        if (path.dirname(resolved) === outputRoot && path.basename(resolved).startsWith('.portable-build-')) {
            fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
        }
    }
}

buildPortable().catch(error => {
    console.error(`Build portátil: ${error.message}`);
    process.exitCode = 1;
});
