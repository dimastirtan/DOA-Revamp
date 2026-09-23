@extends('layouts.app')

@section('title', $manual->n_manual)

@section('content')
    {{-- <div class="flex h-[calc(100vh-80px)] bg-gray-50 text-xs"> --}}
    {{-- <div class="flex h-screen bg-gray-50 text-xs"> --}}
    <div class="flex bg-gray-50 text-xs">

        <!-- SIDEBAR (kiri kecil) -->
        <aside id="chapterSidebar"
            class="hidden md:flex flex-col
              w-56
              bg-white border-r
              transition-all duration-300">



            {{-- HEADER --}}
            {{-- <div class="p-3 border-b flex items-center justify-between"> --}}
            <div class="p-3 border-b flex items-center gap-2">
                {{-- COLLAPSE BUTTON --}}
                <button onclick="toggleSidebar()" class="text-slate-600 hover:text-blue-600 text-sm" title="Hide chapters">☰
                </button>
                <div class="text-xs font-semibold tracking-wide">CHAPTERS</div>
                {{-- <span class="text-xs font-semibold">CHAPTERS</span> --}}

            </div>

            {{-- SEARCH --}}
            <div class="p-3">
                <input id="chapterSearch" type="text" class="w-full text-xs border rounded px-2 py-1"
                    placeholder="Search chapter..." onkeyup="filterChapters()">
            </div>

            {{-- LIST --}}
            <div id="chapterList" class="overflow-y-auto px-3 pb-4 space-y-2 flex-1">
                @foreach ($chapters as $c)
                    <button data-id="{{ $c->id }}" onclick="openChapter({{ $c->id }})" {{-- class="w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded transition"> --}}
                        class="chapter-btn w-full flex items-center justify-between
                                px-3 py-2 bg-gray-100 hover:bg-gray-200
                                rounded transition">
                        <span class="font-semibold mr-2">{{ str_pad($c->i_chapter_no, 2, '0', STR_PAD_LEFT) }}</span>
                        <span class="truncate">{{ $c->n_chapter_title }}</span>
                    </button>
                @endforeach
            </div>
        </aside>

        <div id="sidebarTab" onclick="toggleSidebar()"
            class="hidden md:flex
            items-start justify-center
            w-6
            bg-blue-700
            text-white
            cursor-pointer
            transition-all duration-300"
            title="Show Chapters">
            ☰
        </div>
        <!-- MOBILE: drawer button -->
        <div class="md:hidden fixed top-16 left-3 z-50">
            <button onclick="toggleMobileSidebar()"
                class="w-9 h-9
               flex items-center justify-center
               bg-blue-700 text-white
               rounded-md shadow">
                ☰
            </button>
        </div>

        <!-- MOBILE SIDEBAR (drawer) -->
        <div id="mobileSidebar"
            class="fixed inset-y-0 left-0 w-64
            bg-white border-r p-3
            transform -translate-x-full
            transition-transform duration-300
            z-40 md:hidden">

            <div class="flex justify-between items-center mb-3">
                <div class="text-xs font-semibold">CHAPTERS</div>
                <button onclick="toggleMobileSidebar()" class="text-lg">✕</button>
            </div>

            <!-- search -->
            <input id="chapterSearchMobile" class="w-full text-xs border rounded px-2 py-1 mb-3"
                placeholder="Search chapter..." onkeyup="filterChaptersMobile()">

            <!-- list -->
            <div id="chapterListMobile" class="overflow-y-auto text-xs space-y-2">
                @foreach ($chapters as $c)
                    <button onclick="openChapter({{ $c->id }}); closeMobileSidebar();"
                        class="w-full flex items-center justify-between
                       px-3 py-2
                       bg-gray-100 hover:bg-gray-200
                       rounded transition">
                        <span class="font-semibold">
                            {{ str_pad($c->i_chapter_no, 2, '0', STR_PAD_LEFT) }}
                        </span>
                        <span class="truncate">
                            {{ $c->n_chapter_title }}
                        </span>
                    </button>
                @endforeach
            </div>
        </div>

        <!-- MAIN -->
        {{-- <div class="flex-1 flex flex-col h-full"> --}}

        {{-- <div class="flex-1 flex flex-col h-full"> --}}
        <div class="flex-1 flex flex-col h-fit">

            <!-- viewer iframe -->
            <div class="flex-1 relative">
                {{-- LOADING OVERLAY --}}
                <div id="pdfLoader"
                    class="absolute inset-0
                bg-white/80
                flex items-center justify-center
                z-10
                hidden">
                    <div class="relative w-28 h-28 flex items-center justify-center">
                        <!-- Logo PTDI -->
                        <img src="{{ asset('img/loader_ptdi.png') }}" alt="PTDI Logo Loader"
                            class="absolute w-20 h-20 z-10">

                        <!-- Lingkaran gradasi berputar -->
                        <div class="absolute inset-0 flex items-center justify-center">
                            <div class="spin-ring"></div>
                        </div>
                    </div>
                </div>
                <iframe id="chapterFrame" class="w-full h-full border-0 bg-gray-100" style="height: 150vh">
                </iframe>
            </div>
        </div>
    </div>

    <!-- small inline styles for compact font -->
    <style>
        html,
        body {
            font-size: 15px;
        }

        .chapter-btn.active {
            background-color: #e0f2fe;
            /* blue-50 */
            color: #1e3a8a;
            /* blue-900 */
            font-weight: 600;
            border-left: 3px solid #2563eb;
        }

        /* Loader Spinner untuk iframe pdf */
        @keyframes spin {
            from {
                transform: rotate(0deg);
            }

            to {
                transform: rotate(360deg);
            }
        }

        .spin-ring {
            width: 6.5rem;
            height: 6.5rem;
            border-radius: 50%;
            background: conic-gradient(#0047ab,
                    #00bfff,
                    #00ffcc,
                    #0047ab);
            animation: spin 2s linear infinite;
            position: relative;
        }

        .spin-ring::before {
            content: "";
            position: absolute;
            inset: 6px;
            /* ketebalan border */
            background-color: transparent;
            /* transparan, bukan hitam lagi */
            border-radius: 50%;
        }
    </style>

    <style>
        #chapterSidebar.collapsed {
            width: 0;
            padding: 0;
            overflow: hidden;
        }

        #sidebarTab {
            display: none;
        }

        #chapterSidebar.collapsed+#sidebarTab {
            display: flex;
        }
    </style>

    <script>
        const loader = document.getElementById('pdfLoader');
        const frame = document.getElementById('chapterFrame');

        function showLoader() {
            loader.classList.remove('hidden');
        }

        function hideLoader() {
            loader.classList.add('hidden');
        }

        // function cloneDownloadBtn(btnElement) {
        //     // 1. Select the original element (e.g., a button)
        //     const originalElement = btnElement;
        //     // 2. Clone the element deeply (including all its children)
        //     // The 'true' argument ensures a deep clone
        //     const clonedElement = originalElement.cloneNode(true);
        //     // 3. Replace the original element in the DOM with the cloned one
        //     originalElement.replaceWith(clonedElement);
        //     return clonedElement;
        // }

        function openChapter(id) {
            // 1️⃣ show spinner immediately
            showLoader();

            // 2️⃣ set iframe src (trigger loading)
            // frame.src = "{{ url('/mymanual/viewchapter') }}/" + id;
            // frame = cloneDownloadBtn(frame);

            // frame.src = "{{ asset('pdfjs/web/viewer.html') }}?file=" +
            //     encodeURIComponent("{{ url('/mymanual/file') }}/" + id) +
            //     "&allowDownload={{ $access['allow_download'] ? 1 : 0 }}&" +
            //     "&allowPrint={{ $access['allow_print'] ? 1 : 0 }}";

            const viewer_url = "{{ asset('pdfjs/web/viewer.html') }}";
            const allowDownloadParam = "{{ $access['allow_download'] ? 1 : 0 }}";
            const allowPrintparam = "{{ $access['allow_print'] ? 1 : 0 }}"
            const file_url = encodeURIComponent("{{ url('/mymanual/file') }}" + "/" + id);
            const userid = "{{ urlencode(auth()->user()->name) }}";
            const ip = "{{ request()->ip() }}";
            const time = "{{ now()->timestamp }}";

            frame.src = viewer_url +
                "?allowDownload=" + allowDownloadParam + "&allowPrint=" + allowPrintparam +
                "&file=" + file_url + "&userid=" + userid + "&ip=" + ip + "&time=" + time;

            // frame.src = "{{ asset('pdfjs/web/viewer.html') }}?" +
            //     "allowDownload={{ $access['allow_download'] ? 1 : 0 }}&allowPrint={{ $access['allow_print'] ? 1 : 0 }}" +
            //     "&file=" + encodeURIComponent("{{ url('/mymanual/file') }}/" + id);

            // 3️⃣ highlight chapter
            document.querySelectorAll('.chapter-btn')
                .forEach(btn => btn.classList.remove('active'));

            document.querySelectorAll('.chapter-btn[data-id="' + id + '"]')
                .forEach(btn => btn.classList.add('active'));

            // 4️⃣ remember last chapter
            sessionStorage.setItem('activeChapter', id);
        }

        // 5️⃣ hide spinner when iframe finished loading
        frame.addEventListener('load', () => {
            // sedikit delay biar halus
            setTimeout(hideLoader, 300);
        });

        // restore last opened chapter
        document.addEventListener('DOMContentLoaded', function() {
            const last = sessionStorage.getItem('activeChapter');
            if (last) {
                openChapter(last);
            }
        });

        function filterChapters() {
            const q = document.getElementById('chapterSearch').value.toLowerCase();
            document.querySelectorAll('#chapterList button').forEach(btn => {
                btn.style.display = btn.innerText.toLowerCase().includes(q) ? 'flex' : 'none';
            });
        }

        // function toggleMobileSidebar() {
        //     document.getElementById('mobileSidebar').classList.toggle('-translate-x-full');
        // }

        // function filterChapters() {
        //     const q = document.getElementById('chapterSearch').value.toLowerCase();
        //     document.querySelectorAll('#chapterList button').forEach(btn => {
        //         btn.style.display = btn.innerText.toLowerCase().includes(q) ? 'flex' : 'none';
        //     });
        // }

        // function filterChaptersMobile() {
        //     const q = document.getElementById('chapterSearchMobile').value.toLowerCase();
        //     document.querySelectorAll('#chapterListMobile button').forEach(btn => {
        //         btn.style.display = btn.innerText.toLowerCase().includes(q) ? 'flex' : 'none';
        //     });
        // }

        // // Zoom helpers (applies CSS zoom to iframe content area)
        // let zoomLevel = 1;

        // function zoomIn() {
        //     zoomLevel += 0.1;
        //     applyZoom();
        // }

        // function zoomOut() {
        //     zoomLevel = Math.max(0.4, zoomLevel - 0.1);
        //     applyZoom();
        // }

        // function resetZoom() {
        //     zoomLevel = 1;
        //     applyZoom();
        // }

        // function fitToScreen() {
        //     zoomLevel = 0.9;
        //     applyZoom();
        // }

        // function applyZoom() {
        //     const f = document.getElementById('chapterFrame');
        //     f.style.zoom = zoomLevel;
        // }

        // // disable right-click + print on parent page as additional protection
        // document.addEventListener('contextmenu', e => e.preventDefault());
        // document.addEventListener('keydown', function(e) {
        //     if (e.key === "PrintScreen" || (e.ctrlKey && ['p', 's', 'u'].includes(e.key.toLowerCase()))) {
        //         e.preventDefault();
        //         alert('Function disabled');
        //     }
        // });
    </script>

    <script>
        function toggleSidebar() {
            const sidebar = document.getElementById('chapterSidebar');
            const tab = document.getElementById('sidebarTab');

            const collapsed = sidebar.classList.toggle('collapsed');

            sessionStorage.setItem('sidebarCollapsed', collapsed);
        }

        document.addEventListener('DOMContentLoaded', () => {
            const collapsed = sessionStorage.getItem('sidebarCollapsed') === 'true';

            if (collapsed) {
                document.getElementById('chapterSidebar')
                    .classList.add('collapsed');
            }
        });

        // Mobile
        function toggleMobileSidebar() {
            const sidebar = document.getElementById('mobileSidebar');
            sidebar.classList.toggle('-translate-x-full');
        }

        function closeMobileSidebar() {
            const sidebar = document.getElementById('mobileSidebar');
            sidebar.classList.add('-translate-x-full');
        }
    </script>
@endsection
