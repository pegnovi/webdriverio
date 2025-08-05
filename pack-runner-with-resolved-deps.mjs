import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const packagesDir = path.resolve(__dirname, 'packages')

// 📦 List of packages to build
const targetPackages = [
    'wdio-runner',
    'wdio-local-runner',
    'wdio-browser-runner'
]

function normalizePackageName(pkgName) {
    return pkgName.replace(/^@/, '').replace(/\//g, '-')
}

// Step 1: Build a map of all workspace package versions
const getWorkspaceVersions = async () => {
    const entries = await fs.readdir(packagesDir, { withFileTypes: true })
    const versionMap = {}

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const pkgPath = path.join(packagesDir, entry.name, 'package.json')
            try {
                const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))
                if (pkg.name === '@wdio/runner' || pkg.name === '@wdio/local-runner') {
                    const nomralizedPackageName = normalizePackageName(pkg.name)
                    // 🔧 Specify github release url for specific dependencies (these are the custom release tgzs that we also create here that our other custom releases depend on)
                    versionMap[pkg.name] = `https://github.com/pegnovi/webdriverio/releases/download/v${pkg.version}-runner-custom/${nomralizedPackageName}-${pkg.version}.tgz`
                }
                else {
                    versionMap[pkg.name] = pkg.version
                }
            } catch {
                continue
            }
        }
    }

    return versionMap
}

// Step 2: Replace workspace:* with actual versions or custom overrides
const resolveDeps = (deps = {}, versionMap) => {
    console.log(`=====================================`)
    console.log(`===== Resolving dependencies... =====`)
    const resolved = {}
    for (const [dep, version] of Object.entries(deps)) {
        if (version.startsWith('workspace:')) {
            console.log(`dep: ${dep}: ${version}`)
            console.log(`change to: ${dep}: ${versionMap[dep]}\n`)
            resolved[dep] = versionMap[dep] || version
        } else {
            resolved[dep] = version
        }
    }
    console.log(`=====================================\n`)
    return resolved
}

// Step 3: Process each target package
const versionMap = await getWorkspaceVersions()
const topLevelDir = path.resolve(__dirname)

for (const pkgName of targetPackages) {
    const pkgPath = path.resolve(packagesDir, `${pkgName}/package.json`)
    const backupPath = pkgPath + '.bak'

    console.log(`📦 Packing ${pkgName}...`)

    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))
    await fs.writeFile(backupPath, JSON.stringify(pkg, null, 2))

    pkg.dependencies = resolveDeps(pkg.dependencies, versionMap)
    pkg.devDependencies = resolveDeps(pkg.devDependencies, versionMap)

    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2))

    try {
        await execAsync('pnpm pack', {
            cwd: path.dirname(pkgPath),
            stdio: 'inherit',
        })

        // Move the generated .tgz file to the top-level directory
        const tgzName = `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`
        const tgzPath = path.resolve(path.dirname(pkgPath), tgzName)
        const destPath = path.resolve(topLevelDir, tgzName)

        await fs.rename(tgzPath, destPath)

        console.log(`✅ ${pkgName} packed and moved to top-level as ${tgzName}.`)
    } catch (err) {
        console.error(`❌ Failed to pack ${pkgName}:`, err.stderr || err)
    }

    await fs.rename(backupPath, pkgPath)
    console.log(`🔄 Restored original package.json for ${pkgName}\n`)
}
