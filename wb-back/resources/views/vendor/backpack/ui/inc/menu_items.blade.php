{{-- This file is used for menu items by any Backpack v6 theme --}}
<li class="nav-item">
    <a class="nav-link" href="{{ backpack_url('dashboard') }}">
        <i class="la la-home nav-icon"></i> {{ trans('backpack::base.dashboard') }}
    </a>
</li>

<x-backpack::menu-item 
    title="Users" 
    icon="la la-users" 
    :link="backpack_url('user')" 
/>

<x-backpack::menu-item 
    title="Warehouse Coefficients" 
    icon="la la-warehouse" 
    :link="backpack_url('warehouse-coefficient')" 
/>

<x-backpack::menu-item 
    title="Notifications" 
    icon="la la-bell" 
    :link="backpack_url('notification')" 
/>
