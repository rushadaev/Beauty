<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    protected $table = 'feedbacks';
    
    protected $fillable = [
        'cabinet_id', 'feedback_id', 'imtId', 'nmId', 'subjectId', 'userName', 'text', 'productValuation',
        'createdDate', 'updatedDate', 'answer', 'status', 'productDetails', 'photoLinks', 'wasViewed'
    ];

    protected $casts = [
        'productDetails' => 'array',
        'photoLinks' => 'array',
        'wasViewed' => 'boolean',
    ];

    public function cabinet()
    {
        return $this->belongsTo(Cabinet::class);
    }
}