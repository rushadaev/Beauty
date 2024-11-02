<?php
namespace App\Models;

use Backpack\CRUD\app\Models\Traits\CrudTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use CrudTrait;
    use HasFactory;

    protected $fillable = [
        'user_id',
        'settings',
        'status'
    ];

    protected $casts = [
        'settings' => 'array', // Cast the settings column to an array
    ];

    protected $appends = ['cabinet'];
   /**
     * Get the user that owns the notification.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getCabinetIdAttribute()
    {
        return $this->settings['cabinetId'] ?? null;
    }

    public function loadCabinet()
    {
        $cabinetId = $this->cabinet_id; // This comes from the accessor.
        return Cabinet::whereRaw("settings->>'cabinet_id' = ?", [$cabinetId])->first();
    }

    public function getCabinetAttribute()
    {
        $cabinetId = $this->settings['cabinetId'] ?? null;

        if ($cabinetId) {
            return Cabinet::whereRaw("settings->>'cabinet_id' = ?", [$cabinetId])->first();
        }

        return null;
    }

    public function cabinet()
    {
        return $this->belongsTo(Cabinet::class, 'cabinet_id', 'settings->cabinet_id');
    }
}
