// src/utils/pow/solveTask.ts

import path from 'path';
import fs from 'fs';
import vm from 'vm';

// Step 1: Load wasm_exec.js (adjust the path to where you store the wasm_exec.js file)
const wasmExecPath = path.join(__dirname, 'wasm_exec.js');
const wasmExecCode = fs.readFileSync(wasmExecPath, 'utf8');
vm.runInThisContext(wasmExecCode); // This defines `global.Go`

declare var Go: any;

export interface TaskInput {
    // Your TaskInput interface definition
}

// Step 2: Create a function to run WebAssembly in Node.js
async function solveTaskInNode(wasmPath: string, taskInput: TaskInput): Promise<any> {
    const go = new Go();

    // Load the WebAssembly file from the file system
    const wasmBuffer = fs.readFileSync(wasmPath);

    // Instantiate WebAssembly with the Go import object
    const { instance } = await WebAssembly.instantiate(wasmBuffer, go.importObject);
    go.run(instance);

    // Now call solveTask
    try {
        const solveTaskResult = (global as any).solveTask(taskInput);
        return solveTaskResult;
    } catch (error) {
        throw error;
    }
}

// Step 3: Define the wasmPath and taskInput
const wasmPath = path.join(__dirname, 'solve.wasm'); // Path to your solve.wasm file

// Export the function
export {
    solveTaskInNode,
    wasmPath,
};
