<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $telegram_id = $request->get('telegram_id');
        $task_id = $request->get('task_id');

        $query = Task::query();
//        if ($telegram_id) {
//            $query->where('user_id', $telegram_id);
//        }

        if (isset($task_id)) {
            $query->where('id', $task_id);
        }

        $query->orderBy('status', 'desc');

        $tasks = $query->get();

        return response()->json($tasks, 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'nullable|string|max:255',
            'user_id' => 'nullable|integer',
            'description' => 'nullable|string',
            'task_number' => 'nullable|integer',
            'responsible' => 'nullable|string|max:255',
            'deadline' => 'nullable|date',
            'assigned_date' => 'nullable|date',
            'status' => 'nullable',
        ]);

        $task = Task::create($request->all());

        return response()->json($task, 200);
    }

    public function update(Request $request, Task $task)
    {
        $request->validate([
            'name' => 'nullable|string|max:255',
            'user_id' => 'nullable|integer',
            'description' => 'nullable|string',
            'task_number' => 'nullable|integer',
            'responsible' => 'nullable|string|max:255',
            'deadline' => 'nullable|date',
            'assigned_date' => 'nullable|date',
            'status' => 'nullable',
        ]);


        $task->update($request->all());

        return response()->json($task, 200);
    }

    public function destroy(Task $task)
    {
        $task->delete();

        return response()->json($task, 200);
    }

    public function closeTask($id)
    {
        $task = Task::find($id);
        $task->status = 'closed';
        $task->save();
        return response()->json($task, 200);
    }
}
