<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Cabinet extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'name', 'settings',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

    // Define the relationship with User
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Define the relationship with APIKey
    public function apiKeys()
    {
        return $this->hasMany(APIKey::class);
    }

    public function getFeedbackApiKey()
    {
        $apiKey = $this->apiKeys()->where('service', 'feedback')->first();
        return $apiKey ? $apiKey->api_key : null;
    }

    public function feedbacks()
    {
        return $this->hasMany(Feedback::class);
    }

    // Accessor for group_chat_id
    public function getGroupChatIdAttribute()
    {
        return $this->settings ?? null;
    }

    // Accessor for enabled
    public function getEnabledAttribute()
    {
        return $this->settings['enabled'] ?? false;
    }

    public function getCabinetIdAttribute()
    {
        return $this->settings['cabinet_id'] ?? null;
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'cabinet_id', 'cabinet_id');
    }

}
