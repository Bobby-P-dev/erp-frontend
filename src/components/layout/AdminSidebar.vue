<script setup>
import { ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { 
    LayoutDashboard, 
    Users, 
    Settings,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Database
} from '@lucide/vue'

const route = useRoute()
const isCollapsed = ref(false)
const expandedMenus = ref({})

const toggleMenu = (name) => {
    expandedMenus.value[name] = !expandedMenus.value[name]
}

const navigation = [
    { name: 'Dashboard', to: 'admin.dashboard', icon: LayoutDashboard },
    { 
        name: 'Master Data', 
        icon: Database,
        children: [
            { name: 'Companies', to: 'admin.master.company' },
            { name: 'Divisions', to: 'admin.master.division' },
            { name: 'Positions', to: 'admin.master.position' },
            { name: 'Permission Categories', to: 'admin.master.permission-category' },
            { name: 'Permissions', to: 'admin.master.permission' },
            { name: 'Roles', to: 'admin.master.role' },
            { name: 'Job Levels', to: 'admin.master.job-level' },
            { name: 'Employees', to: 'admin.master.employee' },
            { name: 'Users', to: 'admin.master.user' }
        ]
    },
    { name: 'Users', to: '#', icon: Users },
    { name: 'Settings', to: '#', icon: Settings },
]

const isActive = (routeName) => {
    if (routeName === '#') return false
    if (!route.name) return false
    return route.name === routeName || String(route.name).startsWith(routeName + '.')
}

const isChildActive = (item) => {
    if (!item.children) return false
    return item.children.some(child => isActive(child.to))
}

navigation.forEach(item => {
    if (item.children && isChildActive(item)) {
        expandedMenus.value[item.name] = true
    }
})
</script>

<template>
    <aside 
        class="bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 transition-all duration-300 relative z-20"
        :class="isCollapsed ? 'w-20' : 'w-72'"
    >
        <button 
            @click="isCollapsed = !isCollapsed"
            class="absolute -right-3 top-8 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm z-30"
        >
            <ChevronRight v-if="isCollapsed" class="w-4 h-4" />
            <ChevronLeft v-else class="w-4 h-4" />
        </button>

        <div 
            class="h-[72px] flex items-center border-b border-gray-100 whitespace-nowrap overflow-hidden transition-all duration-300"
            :class="isCollapsed ? 'px-0 justify-center' : 'px-6'"
        >
            <div class="flex items-center gap-3 text-indigo-600">
                <div class="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-200">
                    E
                </div>
                <span 
                    class="text-xl font-bold text-gray-900 tracking-tight transition-all duration-300"
                    :class="isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'"
                >
                    ERP Admin
                </span>
            </div>
        </div>

        <nav class="flex-1 py-6 space-y-1.5 transition-all duration-300" :class="isCollapsed ? 'px-3 overflow-visible' : 'px-4 overflow-y-auto overflow-x-hidden'">
            <div v-for="item in navigation" :key="item.name" class="relative group">
                <component
                    :is="item.children ? 'button' : RouterLink"
                    :to="item.children ? undefined : (item.to === '#' ? '' : { name: item.to })"
                    @click="item.children ? toggleMenu(item.name) : undefined"
                    :class="[
                        'w-full relative flex items-center justify-between py-3 rounded-xl text-sm font-medium transition-all duration-300',
                        (item.children ? isChildActive(item) : isActive(item.to))
                            ? 'text-indigo-700 bg-indigo-50/80 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
                        isCollapsed ? 'px-0 justify-center' : 'px-4 gap-3'
                    ]"
                >
                    <div class="flex items-center gap-3">
                        <div 
                            v-if="item.children ? isChildActive(item) : isActive(item.to)" 
                            class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-r-full"
                        ></div>
                        <component 
                            :is="item.icon" 
                            :class="[
                                'w-5 h-5 shrink-0 transition-colors duration-300',
                                (item.children ? isChildActive(item) : isActive(item.to)) ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                            ]" 
                        />
                        <span 
                            class="transition-all duration-300 whitespace-nowrap"
                            :class="isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'"
                        >
                            {{ item.name }}
                        </span>
                    </div>

                    <ChevronDown 
                        v-if="item.children && !isCollapsed" 
                        class="w-4 h-4 shrink-0 transition-transform duration-300"
                        :class="[
                            expandedMenus[item.name] ? 'rotate-180 text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                        ]"
                    />
                </component>

                <div 
                    v-if="item.children && !isCollapsed && expandedMenus[item.name]" 
                    class="mt-1 space-y-1 overflow-hidden"
                >
                    <RouterLink
                        v-for="child in item.children"
                        :key="child.name"
                        :to="child.to === '#' ? '' : { name: child.to }"
                        :class="[
                            'flex items-center pl-[3.25rem] pr-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                            isActive(child.to)
                                ? 'text-indigo-700 bg-indigo-50/50'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                        ]"
                    >
                        {{ child.name }}
                    </RouterLink>
                </div>

                <div 
                    v-if="item.children && isCollapsed" 
                    class="absolute left-full top-0 pl-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-300 z-50 w-48 origin-left scale-95 group-hover:scale-100"
                >
                    <div class="bg-white border border-gray-100 shadow-lg rounded-xl p-2 flex flex-col gap-1">
                        <div class="px-3 py-1.5 text-xs font-bold text-gray-800 border-b border-gray-50 mb-1">
                            {{ item.name }}
                        </div>
                        <RouterLink
                            v-for="child in item.children"
                            :key="child.name"
                            :to="child.to === '#' ? '' : { name: child.to }"
                            :class="[
                                'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                isActive(child.to)
                                    ? 'text-indigo-700 bg-indigo-50'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            ]"
                        >
                            {{ child.name }}
                        </RouterLink>
                    </div>
                </div>

                <div 
                    v-if="!item.children && isCollapsed"
                    class="absolute left-full top-1/2 -translate-y-1/2 pl-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-300 z-50 origin-left scale-95 group-hover:scale-100"
                >
                    <div class="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap shadow-sm">
                        {{ item.name }}
                    </div>
                </div>

            </div>
        </nav>

    </aside>
</template>