import ts = require('typescript');

const opts: ts.CompilerOptions = {
    allowJs: true
};

namespace Makers {
    const identifiers: ReadonlyArray<string> = ["a", "b", "c", "d", "prototype"];
    const types: ReadonlyArray<string> = ["a", "b", "c", "d", "any", "{}", "object", "string", "{ 'a': any }"];

    export function createDeclFile() {
        return repeatRandom(getDeclFileStatement, 3, ";");
    }

    function getDeclFileStatement() {
        function makeNamespace(): string {
            return `declare namespace ${randomId()} {\r\n${repeatRandom(getAmbientDeclFileStatement, 2)}\r\n}`
        }

        function makeClassDecl() {
            return `declare class ${randomId()} ${maybe(makeExtends)} {\r\n` + repeatRandom(makeClassMember, 3, "\r\n") + "\r\n}\r\n";
        }

        function makeFunctionDecl() {
            return `declare function ${randomId()}(): void;`;
        }

        function makeConstDecl() {
            return `declare const ${randomId()}: ${randomType()};`
        }

        function makeExtends() {
            return `extends ${randomId()}`;
        }

        function makeAmbientFunctionDecl() {
            return `function ${randomId()}(): void;`;
        }

        function makeAmbientConstDecl() {
            return `const ${randomId()}: ${randomType()};`
        }

        function getAmbientDeclFileStatement() {
            return randomElementOf([makeAmbientConstDecl, makeAmbientFunctionDecl])();
        }

        const statements = [makeNamespace, makeClassDecl, makeFunctionDecl, makeConstDecl];

        function prop() {
            return `${randomId()}: ${randomType()}`;
        }
        function method() {
            return `${randomId()}(): ${randomType()};`
        }
        function staticProp() {
            return `static ${randomId()}: ${randomType()};`
        }
        function staticMethod() {
            return `static ${randomId()}(): ${randomType()};`
        }
        const members = [prop, method, staticProp, staticMethod];

        function makeClassMember() {
            return repeatRandom(() => randomElementOf(members)(), 3);
        }

        return repeatRandom(() => randomElementOf(statements)(), 3);
    }

    export function createJsFile() {
        function makePrototypeAssignment() {
            return `${makeLValue()}.prototype = ${makeExpression()};`;
        }

        function makeNormalAssignment() {
            return `${makeLValue()} = ${makeExpression()};`;
        }

        function makeVariableDeclaration() {
            return `var ${randomId()} = ${makeExpression()};`;
        }

        function makeFunctionDeclaration() {
            return `function ${randomId()}() { }`;
        }

        function makeExpandoDeclaration() {
            const id = randomId();
            return `const ${id} = {};\r\n${id}.${randomId()} = ${makeExpression()};`;
        }

        function makeLValue() {
            return randomElementOf([
                randomId,
                () => `${randomId()}.${randomId()}`,
                () => `${randomId()}.${randomId()}.${randomId()}`,
                () => `${randomId()}.${randomId()}.${randomId()}.${randomId()}`,
            ])();
        }

        function makeObjectLiteral() {
            return '{' + repeatRandom(makeProperty, 3, ",") + "}";

            function makeProperty(): string {
                return `${randomId()}: ${makeExpression()}`;
            }
        }

        function makeClassExpression() {
            return `class { constructor() { ${repeatRandom(makeJsConstructorStatement, 2)} } ${repeatRandom(makeJsClassMember, 3)}`;
        }

        function makeJsConstructorStatement() {
            return `this.${randomId} = ${makeExpression()};`;
        }

        function makeJsClassMember() {
            return `${randomId()}() { }`;
        }

        function makeFunctionExpression() {
            return `function() { }`;
        }
        const expressions = [makeObjectLiteral, () => "undefined", makeFunctionExpression];

        function makeExpression() {
            return randomElementOf(expressions)();
        }

        return randomElementOf([
            makePrototypeAssignment,
            makeNormalAssignment,
            makeVariableDeclaration,
            makeFunctionDeclaration,
            makeExpandoDeclaration
        ])();
    }

    function maybe(produce: () => string, likelihood = 0.5) {
        return (Math.random() < likelihood) ? produce() : "";
    }

    function repeatRandom(produce: () => string, max: number, joiner = "\r\n") {
        const ret: string[] = [];
        const count = Math.floor((max + 1) * Math.random());
        for (let i = 0; i < count; i++) {
            ret.push(produce());
        }
        return ret.join(joiner);
    }

    function randomType() {
        return randomElementOf(types);
    }

    function randomId() {
        return randomElementOf(identifiers);
    }

    function randomElementOf<T>(arr: ReadonlyArray<T>): T {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}


class MyHost implements ts.CompilerHost {
    files: Map<string, ts.SourceFile> = new Map();
    cachedLower: Map<string, ts.SourceFile> = new Map();
    defaultHost = ts.createCompilerHost(opts);

    update(fileName: string, content: string) {
        if (this.files.has(fileName)) {
            const sf = this.files.get(fileName)!;
            if (sf.text === content) return;
        }
        this.files.set(fileName, ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest));
    }

    getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError?: ((message: string) => void) | undefined, shouldCreateNewSourceFile?: boolean | undefined): ts.SourceFile | undefined {
        if (this.files.has(fileName)) {
            return this.files.get(fileName)!;
        }

        if (this.cachedLower.has(fileName)) {
            return this.cachedLower.get(fileName)!;
        }

        const underlying = this.defaultHost.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
        if (!underlying) {
            throw new Error(`Underlying host did not read ${fileName}`);
        }
        this.cachedLower.set(fileName, underlying);
        return underlying;
    }
    getDefaultLibFileName(options: ts.CompilerOptions): string {
        return this.defaultHost.getDefaultLibFileName(options);
    }
    writeFile() {

    }
    getCurrentDirectory(): string {
        return this.defaultHost.getCurrentDirectory();
    }
    getDirectories(path: string): string[] {
        return this.defaultHost.getDirectories(path);
    }
    getCanonicalFileName(fileName: string): string {
        return this.defaultHost.getCanonicalFileName(fileName);
    }
    useCaseSensitiveFileNames(): boolean {
        return true;
    }
    getNewLine(): string {
        return "\r\n";
    }
    fileExists(fileName: string): boolean {
        return this.files.has(fileName) || this.defaultHost.fileExists(fileName);
    }
    readFile(fileName: string): string | undefined {
        if (this.files.has(fileName)) {
            return this.files.get(fileName)!.text;
        }
        return this.defaultHost.readFile(fileName);
    }
    getRootNames(): string[] {
        const ret: string[] = [];
        this.files.forEach((_, k) => ret.push(k));
        return ret;
    }
}

function run() {

    const host = new MyHost();
    const names = ["file1.d.ts", "file2.js", "file3.d.ts", "file4.js"];
    const makers = [Makers.createDeclFile, Makers.createJsFile, Makers.createDeclFile, Makers.createJsFile];
    for (let i = 0; i < names.length; i++) {
        host.update(names[i], makers[i]());
    }
    let oldProgram: ts.Program | undefined;
    let counter = 0;
    let bigCounter = 0;
    while (true) {
        const rnd = Math.floor(Math.random() * names.length);
        host.update(names[rnd], makers[rnd]());
        try {
            oldProgram = ts.createProgram(host.getRootNames(), opts, host, oldProgram);
            oldProgram.getTypeChecker();
            oldProgram.getSemanticDiagnostics();
        } catch (e) {
            printFiles();
            throw e;
        }

        if (counter++ === 10000) {
            console.log(`At iteration ${++bigCounter}0000`);
            printFiles();
            counter = 0;
        }
    }

    function printFiles() {
        for (let j = 0; j < names.length; j++) {
            console.log(`-- ${names[j]} --`);
            console.log(host.readFile(names[j]));
        }
    }
}

run();