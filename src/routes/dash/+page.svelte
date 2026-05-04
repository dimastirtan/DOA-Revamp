<script lang="ts">
	import type { PageProps } from './$types';
	import * as Drawer from '$lib/components/ui/drawer/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { gsap } from 'gsap';
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { mainTitle } from '$lib/store';

	import Calendar from '$lib/components/ui/calendar/calendar.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { today, type CalendarDate, parseDate } from '@internationalized/date';
	import { tos } from '$lib/utils';
	import { Toaster } from '$lib/components/ui/sonner/index';

	const id = $props.id();

	let open = $state(false);
	let openTanggal = $state(false);
	let openValid = $state(false);
	let tanggal = $state<CalendarDate | undefined>();
	let valid = $state<CalendarDate | undefined>();
	let anyar = $state(false);
	let showSearch = $state(false);
	let { data }: PageProps = $props();
	let mbukakDoa = $state(false);
	let mbukakTambahDoa = $state(false);
	let mbukakUsers = $state(false);
	let mbukakEditUser = $state(false);
	let navbar = $state();
	let value = $state('aircraft');
	let search = $state('');
	let searchTotal = $state('');
	let searchDoa = $state('');
	let selectedUser = $state<any>({});
	let selectedUserLevel = $state('0');
	let selectedSubtype = $state('');
	let selectedDoaGroup = $state('');
	let selectedDoaIcon = $state('');
	let selectedDoaTitle = $state('');
	let selectedDoa = $state<any>({});
	let selectedDoaType = $state('');
	let mbukakSearch = $state(false);
	let judul = $state('');
	let nomor = $state('');
	let revisi = $state('');
	let animationFrame: number;
	let searchRef = $state<HTMLInputElement | null>(null);
	let loadingLogout = $state(false);
	let loadingDoa = $state(false);
	let loadingDrawer = $state(false);
	let loadingInput = $state(false);
	let fileInputDoa = $state<FileList | null>(null);
	// let dateNow = $state();

	const group = [
		{ icon: 'plane.svg', value: 'aircraft', label: 'Aircraft' },
		{ icon: 'helic.svg', value: 'non_aircraft', label: 'Non Aircraft' }
	];

	let roleEditDoa = $derived(data.user?.userlevel == -1 || data.user?.userlevel == 5);
	let roleUser = $derived(data.user?.userlevel == -1);

	selectedDoa = {
		no: '',
		type: '',
		number: '',
		revision: '',
		date: '',
		date2: '',
		title: ''
	};

	// const user = {
	// 	nik: '',
	// 	userlevel: '',
	// 	activated: '',
	// 	password: '',
	// }

	const subtypes = [
		{ value: '41A', label: 'PART 41A Design Standard Manual (NDM)' },
		{ value: '41B', label: 'PART 41B Drafting Standard Manual (NDS)' },
		{ value: '41C-1', label: 'PART 41C NPS-Mark & Label' },
		{ value: '41C-2', label: 'PART 41C NPS-Part' },
		{ value: '41C-3', label: 'PART 41C NPS-Profile' },
		{ value: '41D', label: 'PART 41D Process Specification Manual (PS20)' },
		{ value: '41E', label: 'PART 41E Material Standard Manual (IMS)-Metallic' },
		{ value: '41F', label: 'PART 41F Design Checklist Standard Manual (DCL)' },
		{ value: '41G', label: 'PART 41G Computation/Software Standard Manual (NCS)' },
		{ value: '41H', label: 'PART 41H Material Specification Standard Manual (NMS)' },
		{ value: '41I', label: 'PART 41I Support Specification Standard Manual (NSS)' },
		{ value: '41N', label: '41 N Standard (Non Aircraft)' },
		{ value: 'AIA-NAS', label: 'AIA-NAS' },
		{ value: 'ANSI', label: 'ANSI' },
		{ value: 'AWO', label: 'Personnel Assignment - AWO' },
		{ value: 'cer', label: 'Certificate' },
		{ value: 'cer2', label: 'Certificate - Non Aircraft' },
		{ value: 'cmd', label: 'Command Media' },
		{ value: 'cp', label: 'Certification Procedure - Non Aircraft' },
		{ value: 'CVE', label: 'Personnel Assignment - CVE' },
		{ value: 'doc', label: 'Documment' },
		{ value: 'doc2', label: 'Documment - Non Aircraft' },
		{ value: 'form', label: 'FORM' },
		{ value: 'form2', label: 'FORM - Non Aircraft' },
		{ value: 'ISO', label: 'ISO' },
		{ value: 'lib', label: 'Library' },
		{ value: 'man', label: 'Manual' },
		{ value: 'man2', label: 'Manual - Non Aircraft' },
		{ value: 'MILSTD', label: 'MILSTD' },
		{ value: 'mtm', label: 'Material Test Method (MTM)' },
		{ value: 'pro', label: 'Procedure' },
		{ value: 'pro2', label: 'Procedure - Non Aircraft' },
		{ value: 'RTCA', label: 'RTCA' },
		{ value: 'SAE', label: 'SAE' },
		{ value: 'standard', label: 'Standard' },
		{ value: 'tm', label: 'Test Method - Non Aircraft' },
		{ value: 'WA', label: 'Working Arrangement - Non Aircraft' },
		{ value: 'wi', label: 'Work Instruction' },
		{ value: 'wi2', label: 'Work Instruction - Non Aircraft' }
	];

	const userlevels = [
		{ value: -1, label: 'Administrator' },
		{ value: 1, label: 'DOA Personel' },
		{ value: 2, label: 'PMO/PPC' },
		{ value: 3, label: 'Non Aircraft' },
		{ value: 5, label: 'Controller' }
	];
	// Meta = Manajemen njuk dadi opo?

	// import { ScrollTrigger } from 'gsap/ScrollTrigger';

	// gsap.registerPlugin(ScrollTrigger);

	let dateNow = $state(Date.now());

	const updateTime = async () => {
		dateNow = Date.now();

		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
			animationFrame = 0;
		}

		animationFrame = requestAnimationFrame(async () => {
			await tick();
			updateTime();
		});
	};

	let formattedDate = $derived.by(() => {
		return new Intl.DateTimeFormat('id-ID', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(new Date(dateNow));
	});

	let formattedTime = $derived.by(() => {
		return new Intl.DateTimeFormat('id-ID', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		})
			.format(new Date(dateNow))
			.replace(/\./g, ':');
	});

	let greeting = $derived.by(() => {
		const hour = new Date(dateNow).getHours();
		if (hour >= 0 && hour <= 10) {
			return 'Pagi';
		} else if (hour >= 11 && hour <= 15) {
			return 'Siang';
		} else if (hour >= 16 && hour <= 19) {
			return 'Sore';
		} else if (hour >= 20 && hour <= 23) {
			return 'Malam';
		} else {
			return '-';
		}
	});

	onMount(async () => {
		const Headroom = (await import('headroom.js')).default;
		new Headroom(navbar, {
			tolerance: {
				up: 0,
				down: 0
			}
			// scroller: scroller
		}).init();
		document.addEventListener('keydown', async (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
				searchRef?.focus();
				e.preventDefault();
				if (mbukakSearch) {
					mbukakSearch = false;
				} else {
					mbukakSearch = true;
				}

				// await tick();
				// console.log('eek');
				// const el = document.querySelector('.search') as HTMLInputElement;
			}
		});

		$mainTitle = group.find((t) => t.value === value)?.label || '';

		if (data.user) {
			console.log(data.user);
		}
		updateTime();
		gsap.fromTo(
			'.plane',
			{
				delay: 0,
				opacity: 0,
				x: -100,
				y: 100
			},
			{
				delay: 0,
				duration: 1,
				opacity: 1,
				x: 0,
				y: 0,
				ease: 'power3.out'
			}
		);

		gsap.to('.plane-img', {
			x: 3,
			y: 3,
			duration: 1,
			repeat: -1,
			yoyo: true,
			ease: 'power1.inOut'
		});

		gsap.to('.heli-img', {
			x: 4,
			// y: 5,
			duration: 1,
			repeat: -1,
			yoyo: true,
			ease: 'power1.inOut'
		});

		// fUsers();
		fDoas();
	});


	$effect(() => {
		if (anyar) {
			judul = '';
			nomor = '';
			revisi = '';
			tanggal = undefined;
			valid = undefined;
			selectedSubtype = '';
			fileInputDoa = null;
		} else if (selectedDoa && Object.keys(selectedDoa).length > 0) {
			// judul = selectedDoa.title || '';
			// nomor = selectedDoa.number || '';
			// revisi = selectedDoa.revision || '';
			// selectedSubtype = selectedDoa.type || '';

			// Guard: skip kalau date sudah bukan string (sudah di-parse sebelumnya)
			if (selectedDoa.date && typeof selectedDoa.date !== 'string') return;

			if (selectedDoa.date && !selectedDoa.date.includes('0000')) {
				try {
					selectedDoa.date = parseDate(selectedDoa.date);
				} catch (e) {
					console.error('Error parsing tanggal:', e);
					selectedDoa.date = undefined;
				}
			} else {
				selectedDoa.date = undefined;
			}

			if (selectedDoa.date2 && typeof selectedDoa.date2 === 'string' && !selectedDoa.date2.includes('1970-01-01')) {
				try {
					selectedDoa.date2 = parseDate(selectedDoa.date2);
				} catch (e) {
					console.error('Error parsing valid date:', e);
					selectedDoa.date2 = undefined;
				}
			} else if (typeof selectedDoa.date2 === 'string') {
				selectedDoa.date2 = undefined;
			}
		}
	});

	const fUsers = async () => {
		loadingDrawer = true;
		setTimeout(async () => {
			const response = await fetch('/-users/r', {
				method: 'GET'
			});

			if (response) {
				response.json().then((res) => {
					loadingDrawer = false;
					const transformedUsers = res.map((user) => ({
						...user,
						userlevel_name: (() => {
							if (user.userlevel == '-1') return 'Administrator';
							if (user.userlevel == '1') return 'DOA Personel';
							if (user.userlevel == '2') return 'PMO/PPC';
							if (user.userlevel == '3') return 'Non Aircraft';
							if (user.userlevel == '5') return 'Controller';
							return '-';
						})(),
						activated: user.userlevel == '0' ? 'Aktivasi' : user.activated === 'Y' ? 'Aktif' : user.activated === 'N' ? 'Nonaktif' : user.activated
					}));
					data = { ...data, users: transformedUsers };
					// console.log(data.users[0]);
				});
			}
		}, 1000);
	};

	const fUser = async (d: boolean = false) => {
		loadingInput = true;
		setTimeout(async () => {
			const response = await fetch('/-users/w', {
				method: 'POST',
				body: JSON.stringify({ e: selectedUser, d })
			});

			if (response.ok) {
				loadingInput = false;
				mbukakEditUser = false;
				fUsers();
			} else {
				loadingInput = false;
				tos('exclamation.svg', 'Gagal', 'Periksa kembali data yang kamu masukkan.');
			}
		}, 1000);
	};

	const fDoa = async (d: boolean = false) => {
		loadingInput = true;
		setTimeout(async () => {
			let body: any;
			// let headers: any = {};

			if (fileInputDoa && fileInputDoa.length > 0) {
				const formData = new FormData();
				formData.append('data', JSON.stringify({ [anyar ? 'i' : 'e']: selectedDoa, d }));
				formData.append('file', fileInputDoa[0]);
				body = formData;
			} else {
				body = JSON.stringify({ [anyar ? 'i' : 'e']: selectedDoa, d });
				// headers['Content-Type'] = 'application/json';
			}

			const response = await fetch('/-doa/w', {
				method: 'POST',
				// headers,
				body: body
			});

			if (response.ok) {
				loadingInput = false;
				mbukakTambahDoa = false;
				fDoas('', '');
				if (mbukakDoa) {
					fDoas('', selectedDoaType);
				} else if (mbukakSearch) {
					fDoas(searchDoa, '');
				}
				tos('exclamation.svg', 'Berhasil', 'DOA kamu sukses masuk ke database.');
			} else {
				loadingInput = false;
				const res = await response.json();
				tos('exclamation.svg', 'Gagal', res.error || 'Periksa kembali data yang kamu masukkan.');
			}
			fileInputDoa = null;
		}, 200);
	};

	const fDoas = async (s: string = '', t: string = '') => {
		if (s || t) {
			loadingDrawer = true;
		} else {
			loadingDoa = true;
		}
		setTimeout(async () => {
			const response = await fetch('/-doa/r', {
				method: 'POST',
				body: JSON.stringify({ s: s, t: t })
			});

			if (response) {
				response.json().then((res) => {
					if (s || t) {
						loadingDrawer = false;
						data = { ...data, doa_selected: res };
						// console.log(data.doa_selected);
					} else {
						loadingDoa = false;
						data = { ...data, doa: res };
						value = res.def;
						console.log(data);
					}
				});
			}
		}, 1000);
	};

	let fLogout = async () => {
		loadingLogout = true;
		const response = await fetch('/-logout', {
			method: 'POST'
		});

		if (response.ok) {
			gsap.to('.plane', {
				duration: 2,
				x: 100,
				y: -100,
				ease: 'power3.out'
			});

			setTimeout(async () => {
				await goto('/login', { replaceState: true, invalidateAll: true });
			}, 500);
		}
	};

	let sortColumn = $state('date');
	let sortDirection = $state('desc');

	const handleSort = (column: string) => {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}
	};

	let filteredDoa = $derived(
		(data.doa_selected || [])
			.filter((doa: any) => !search || (doa.number && doa.number.toLowerCase().includes(search.toLowerCase())) || (doa.nik && doa.nik.toLowerCase().includes(search.toLowerCase())) || (doa.nama && doa.nama.toLowerCase().includes(search.toLowerCase())) || (doa.revision && doa.revision.toLowerCase().includes(search.toLowerCase())) || (doa.date && doa.date.toLowerCase().includes(search.toLowerCase())) || (doa.date2 && doa.date2.toLowerCase().includes(search.toLowerCase())) || (doa.title && doa.title.toLowerCase().includes(search.toLowerCase())))
			.sort((a: any, b: any) => {
				if (!sortColumn) return 0;
				const aValue = a[sortColumn] ? a[sortColumn].toString().toLowerCase() : '';
				const bValue = b[sortColumn] ? b[sortColumn].toString().toLowerCase() : '';
				if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
				if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
				return 0;
			})
	);

	let sortColumnUser = $state('configPenghasil');
	let sortDirectionUser = $state('asc');

	const handleSortUser = (column: string) => {
		if (sortColumnUser === column) {
			sortDirectionUser = sortDirectionUser === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumnUser = column;
			sortDirectionUser = 'asc';
		}
	};

	let filteredUsers = $derived(
		(data.users || [])
			.filter((user: any) => !search || user.username.toLowerCase().includes(search.toLowerCase()) || user.activated.toLowerCase().includes(search.toLowerCase()) || user.userlevel_name.toLowerCase().includes(search.toLowerCase()) || user.configPenghasil.toLowerCase().includes(search.toLowerCase()))
			.sort((a: any, b: any) => {
				if (!sortColumnUser) return 0;
				const aValue = a[sortColumnUser] ? a[sortColumnUser].toString().toLowerCase() : '';
				const bValue = b[sortColumnUser] ? b[sortColumnUser].toString().toLowerCase() : '';
				if (aValue < bValue) return sortDirectionUser === 'asc' ? -1 : 1;
				if (aValue > bValue) return sortDirectionUser === 'asc' ? 1 : -1;
				return 0;
			})
	);
</script>

<Toaster
	position="top-left"
	richColors={false}
	duration={3000}
	visibleToasts={1}
	class="!z-[99999] [--width:340px]! xl:[--width:400px]!"
	toastOptions={{
		unstyled: true,
		classes: {
			toast: 'xl:absolute xl:left-0 mb-14 xl:mb-4 !z-[99999]'
		}
	}}
/>

<img class="fixed bottom-0 left-0 -z-50 h-1/2 invert" src="grad.svg" alt="" />
<img class="fixed top-0 right-0 -z-50 h-1/2 -rotate-180 invert" src="grad.svg" alt="" />

<!-- @b floating button -->
<div bind:this={navbar} class="fixed flex flex-row gap-2 bottom-3 left-1/2 -translate-x-1/2 p-2 bg-[#213C51] !drop-shadow-[0px_0px_10px_rgba(0,0,0,0.1)] z-[10]">
	<!--<div class="flex flex-row bg-white/50 p-2 px-3 gap-3 group w-auto overflow-hidden">
		<!~~ <img
			src="helic.svg?v=3"
			class="w-7 group-hover:rotate-[-45deg] transition-all duration-500"
			alt=""
		/> ~~>
		<div class="flex items-center plane opacity-0">
			<img src="plane.svg?v=2" class="w-5 group-hover:rotate-[-45deg] transition-all duration-500" alt="" />
		</div>
		<p class="">Aircraft</p>
		<img src="down.svg" class="w-2 pt-1" alt="" />
	</div>
-->
		{#if roleEditDoa}
		<div
			class="flex flex-row bg-secondary/85  p-2 px-4 gap-2 group"
			role="button"
			tabindex="0"
			onclick={() => {
				anyar = true;
				selectedDoa = {
					no: '',
					type: '',
					number: '',
					revision: '',
					date: '',
					date2: '',
					title: ''
				};
				$mainTitle = 'Tambah DOA';
				mbukakTambahDoa = true;
			}}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					anyar = true;
					selectedDoa = {
						no: '',
						type: '',
						number: '',
						revision: '',
						date: '',
						date2: '',
						title: ''
					};
					$mainTitle = 'Tambah DOA';
					mbukakTambahDoa = true;
				}
			}}
		>
			<img src="plus-white.svg" class="w-3 group-hover:rotate-[180deg] transition-all duration-1000" alt="" />
			<p class="text-white!">Tambah</p>
		</div>
	{/if}
	<Select.Root type="single" bind:value>
		<Select.Trigger class="flex! flex-row! bg-[#fff]! py-5! px-3! w-48! gap-3! group shadow-none! overflow-hidden! border-0! rounded-none!">
			<!-- {triggerContent} -->
			<!-- <img
			src="helic.svg?v=3"
			class="w-7 group-hover:rotate-[-45deg] transition-all duration-500"
			alt=""
		/> -->
			<div class="flex items-center plane opacity-0">
				<!-- {#if group.find((t) => t.value === value)?.value === 'aircraft'}
					<img src="plane.svg?v=2" class="w-6 group-hover:rotate-[-45deg] transition-all duration-500" alt="" />
				{:else}
					<img src="helic.svg?v=3" class="w-7 group-hover:rotate-[45deg] transition-all duration-500 scale-x-[-1]" alt="" />
				{/if} -->

				<div class="plane-img {group.find((t) => t.value === value)?.value === 'aircraft' ? 'block' : 'hidden'}">
					<img src="plane.svg?v=2" class="w-6 group-hover:rotate-[-45deg] transition-all duration-500" alt="" />
				</div>
				<div class="heli-img {group.find((t) => t.value === value)?.value === 'aircraft' ? 'hidden' : 'block'}">
					<img src="helic.svg?v=3" class="w-7 group-hover:rotate-[25deg] transition-all duration-500 scale-x-[-1]" alt="" />
				</div>
			</div>
			<p class="text-base">{group.find((t) => t.value === value)?.label}</p>
		</Select.Trigger>
		<Select.Content class="mb-2! rounded-none! shadow-none! bg-[#fff]! border-1! border-[#213C51]! p-1!">
			<Select.Group>
				<!-- <Select.Label>Fruits</Select.Label> -->
				{#each group as group (group.value)}
					<Select.Item
						class="rounded-none shadow-none px-3 py-2 border-0 hover:bg-transparent! bg-transparent active:bg-transparent! {group.value !== value && data.doa?.single ? 'hidden' : ''}"
						value={group.value}
						label={group.label}
						onclick={() => {
							$mainTitle = group.label;
						}}
					>
						{#if group.value === 'aircraft'}
							<img src="plane.svg?v=2" class="w-6 mr-2 group-hover:rotate-[-45deg] transition-all duration-500" alt="" />
						{:else}
							<img src="helic.svg?v=3" class="w-7 mr-2 group-hover:rotate-[-45deg] transition-all duration-500 scale-x-[-1]" alt="" />
						{/if}
						<p class="text-base">{group.label}</p>
					</Select.Item>
				{/each}
			</Select.Group>
		</Select.Content>
	</Select.Root>
	{#if roleUser}
		<div
			class="flex flex-row bg-[#fff] p-2 px-3 gap-2 group aspect-squre"
			role="button"
			tabindex="0"
			onclick={() => {
				fUsers();
				$mainTitle = 'Daftar User';
				search = '';
				mbukakUsers = true;
			}}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					fUsers();
					$mainTitle = 'Daftar User';
					search = '';
					mbukakUsers = true;
				}
			}}
		>
			<img src="users2.svg?c" class="w-5 group-hover:rotate-[24deg] transition-all duration-500" alt="" />
		</div>
	{/if}
	<Popover.Root bind:open={mbukakSearch}>
		<Popover.Trigger class="flex! flex-row! bg-[#fff]! p-2! px-3! gap-2! group">
			<img src="search.svg" class="w-4 group-hover:rotate-[90deg] transition-all duration-500" alt="" />
			<p class={roleUser || roleEditDoa ? 'hidden' : ''}>Pencarian</p>
		</Popover.Trigger>
		<Popover.Content preventScroll={true} class="mb-3! rounded-none! shadow-none! bg-[#fff]! w-80!  border-1! border-[#213C51]! p-2!">
			<div class="relative w-full items-center group h-full">
				<img src="search.svg" class=" absolute top-1/2 left-3 h-4! w-4! -translate-y-1/2 group-hover:rotate-[90deg] transition-all duration-500" alt="" />
				<Input
					type="text"
					placeholder="Cari..."
					class="w-full rounded-none bg-transparent border-transparent! placeholder:text-secondary/35 h-full pl-11! pr-11! text-base! focus:!border-transparent shadow-none! focus:!ring-transparent focus:!ring-offset-0"
					autofocus={true}
					bind:value={searchDoa}	
					onkeydown={async (event) => {
						if (event.key === 'Enter') {
							await fDoas(searchDoa, '');
							search = '';
							selectedDoaGroup = '';
							selectedDoaIcon = 'search';
							selectedDoaTitle = 'Pencarian: ' + searchDoa;
							$mainTitle = 'Pencarian: ' + searchDoa;
							mbukakSearch = false;
							mbukakDoa = true;
						}
					}}
				/>
				<button
					type="button"
					class="absolute top-1/2 right-3 h-4! w-4! -translate-y-1/2 cursor-pointer bg-transparent border-0 p-0"
					onclick={async () => {
						await fDoas(searchDoa, '');
						search = '';
						selectedDoaGroup = '';
						selectedDoaIcon = 'search';
						selectedDoaTitle = 'Pencarian: ' + searchDoa;
						$mainTitle = 'Pencarian: ' + searchDoa;
						mbukakSearch = false;
						mbukakDoa = true;
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							fDoas(searchDoa, '');
							search = '';
							selectedDoaGroup = '';
							selectedDoaIcon = 'search';
							selectedDoaTitle = 'Pencarian: ' + searchDoa;
							$mainTitle = 'Pencarian: ' + searchDoa;
							mbukakSearch = false;
							mbukakDoa = true;
						}
					}}
				>
					<img src="enter.svg" class="h-4! w-4!" alt="" />
				</button>
			</div>
		</Popover.Content>
	</Popover.Root>

	<div
		class="flex flex-row bg-[#fff] p-2 px-3 gap-2 group"
		role="button"
		tabindex="0"
		onclick={() => {
			fLogout();
		}}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				fLogout();
			}
		}}
	>
		{#if loadingLogout}
			<img src="spinner_color.svg?a" class="h-4! w-4! mt-1" alt="" />
		{:else}
			<img src="power.svg?d" class="w-4 pt-0 group-hover:rotate-[90deg] transition-all duration-500" alt="" />
		{/if}
	</div>
</div>

<div class="h-full w-full flex z-50 flex-col justify-center items-center gap-4 pt-12 pb-12">
	<div class="w-11/12 h-1/4 flex justify-between">
		<div class="flex flex-row w-1/2 gap-2 pointer-events-none">
			<div class="w-20 flex items-center justify-center aspect-square bg-white/0 p-4">
				<img src="logo.png" class="" alt="Logo" />
			</div>
		</div>

		<!-- @b top bar -->
		<div class="flex flex-row w-1/2 gap-2 justify-end">
			<div class="w-fit bg-white/75 p-4 px-6 border-2 border-transparent">
				<div class="flex gap-1.5">
					<img src="user.svg" class="w-4" alt="" />
					<p class="text-secondary opacity-75">User</p>
				</div>
				<p class="font-medium text-lg whitespace-nowrap overflow-hidden text-ellipsis">
					{#if data.user}
						{data.user.configPenghasil}, {data.user.id}
					{:else}
						Tamu
					{/if}
				</p>
			</div>
			<div class="w-fit bg-white/75 p-4 px-6 border-2 border-transparent">
				<div class="flex gap-1.5">
					<img src="date.svg?f" class="w-5 opacity-75" alt="" />
					<p class="text-secondary opacity-75">Tanggal</p>
				</div>
				<p class="font-medium text-lg whitespace-nowrap overflow-hidden text-ellipsis">{formattedDate}</p>
			</div>
			<div class="w-fit min-w-44 bg-white/75 p-4 px-6 border-2 border-transparent">
				<div class="flex gap-1.5">
					<img src="clock.svg?f" class="w-4" alt="" />
					<p class="text-secondary opacity-75">Jam</p>
				</div>
				<p class="font-medium text-lg whitespace-nowrap overflow-hidden text-ellipsis">{greeting}, {formattedTime}</p>
			</div>
		</div>
	</div>

	<!-- @b list doa -->
	<div class="bg-white/0 flex items-center justify-center w-15/16 h-3/4">
		<div class="bg-white/50 h-full w-full mx-4 my-4 flex flex-col min-h-[30dvh] relative">
			<div class="p-4">
				<img src="spinner_color.svg?a" class=" h-5! w-5! mt-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 {loadingDoa ? 'block' : 'hidden'}" alt="" />
				<div class="flex justify-between w-full bg-[#213C51] p-4 px-6 mb-2">
					<p class="font-medium text-white!">Daftar DOA</p>
					<p class="font-medium text-white!">Jumlah</p>
				</div>
				{#if data.doa}
					{#each data.doa[value === 'non_aircraft' ? 'non_aircraft' : 'aircraft'] || [] as item (item.name)}
						{#if item.sub}
							<div class="withsub">
								<div class="flex justify-between w-full p-2 px-6">
									<div class="flex gap-1.5">
										<img src={item.name.toLowerCase() + '.svg'} class="w-5" alt="" />
										<p class="font-medium">{item.name}</p>
									</div>
									<p class="font-medium">{item.total}</p>
								</div>
								{#each item.sub as sub (sub.name)}
									<div
										class="flex hover:underline cursor-pointer justify-between w-full p-0 px-6 text-secondary opacity-75 group"
										role="button"
										tabindex="0"
										onclick={async () => {
											await fDoas('', sub.type);
											search = '';
											selectedDoaType = sub.type;
											selectedDoaGroup = value.toUpperCase().replace('_', ' ');
											selectedDoaIcon = item.name.toLowerCase();
											selectedDoaTitle = sub.name;
											$mainTitle = sub.name;
											mbukakDoa = true;
										}}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												fDoas('', sub.type);
												search = '';
												selectedDoaType = sub.type;
												selectedDoaGroup = value.toUpperCase().replace('_', ' ');
												selectedDoaIcon = item.name.toLowerCase();
												selectedDoaTitle = sub.name;
												$mainTitle = sub.name;
												mbukakDoa = true;
											}
										}}
									>
										<div class="flex gap-1.5 items-center">
											<div class="pl-2 pr-2 flex justify-center">
												<div class="w-0.5 h-7 border-l border-dashed border-secondary"></div>
											</div>
											<p class="group-hover:scale-[101%] transition-all">{sub.name}</p>
										</div>
										<p class="group-hover:scale-[105%] transition-all">{sub.total}</p>
									</div>
								{/each}
							</div>
						{:else}
							<div
								class="nonsub flex justify-between w-full p-2 px-6 hover:underline cursor-pointer hover:scale-[100.5%] transition-all"
								role="button"
								tabindex="0"
								onclick={async () => {
									await fDoas('', item.type);
									search = '';
									selectedDoaType = item.type;
									selectedDoaGroup = value.toUpperCase().replace('_', ' ');
									selectedDoaIcon = item.name.toLowerCase();
									selectedDoaTitle = item.name;
									$mainTitle = item.name;
									mbukakDoa = true;
								}}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										fDoas('', item.type);
										search = '';
										selectedDoaType = item.type;
										selectedDoaGroup = value.toUpperCase().replace('_', ' ');
										selectedDoaIcon = item.name.toLowerCase();
										selectedDoaTitle = item.name;
										$mainTitle = item.name;
										mbukakDoa = true;
									}
								}}
							>
								<div class="flex gap-1.5">
									<img src={item.name.toLowerCase() + '.svg'} class="w-5" alt="" />
									<p class="font-medium">{item.name}</p>
								</div>
								<p class="font-medium">{item.total}</p>
							</div>
						{/if}
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- @b doa -->
<Drawer.Root
	bind:open={mbukakDoa}
	onClose={() => {
		// console.log('tutup');
		data = { ...data, doa_selected: [], users: [] };
		// console.log(data);
		$mainTitle = group.find((t) => t.value === value)?.label || '';
	}}
>
	<Drawer.Content class="bg-[#fff]! min-h-[95dvh]! flex! items-center! opacity-95!">
		<div class="h-screen w-screen z-50 absolute {loadingDrawer ? 'block' : 'hidden'}"><img src="spinner_color.svg?a" class=" h-5! w-5! absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" alt="" /></div>
		<div class="w-11/12 pt-12 gap-2 flex-col flex">
			<div class="w-full flex justify-between">
				<div class="flex gap-2">
					<div class={selectedDoaGroup ? 'flex' : 'hidden'}>
						<div class="plane-img flex flex-row bg-[#677787] p-2 px-3 gap-2 group">
							<img src={selectedDoaGroup === 'AIRCRAFT' ? 'plane.svg?v=2' : 'helic.svg?v=3'} class="w-4 {selectedDoaGroup === 'AIRCRAFT' ? 'w-4' : 'w-5'}" alt="" />
							<p class="font-medium text-white!">{selectedDoaGroup.toUpperCase().replace('-', ' ')}</p>
						</div>
					</div>

					<div>
						<div class="flex flex-row bg-[#677787] p-2 px-3 gap-2 group max-w-106">
							<img src={selectedDoaIcon + '-white.svg'} class="w-4 inverted" alt="" />
							<p class="font-medium text-white!">{selectedDoaTitle}</p>
						</div>
					</div>
				</div>

				<div class="flex gap-2">
					<div
						role="button"
						tabindex="0"
						onclick={() => {
							anyar = true;
							selectedDoa = {
								no: '',
								type: '',
								number: '',
								revision: '',
								date: '',
								date2: '',
								title: ''
							};
							$mainTitle = 'Tambah DOA';
							mbukakTambahDoa = true;
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								anyar = true;
								selectedDoa = {
									no: '',
									type: '',
									number: '',
									revision: '',
									date: '',
									date2: '',
									title: ''
								};
								$mainTitle = 'Tambah DOA';
								mbukakTambahDoa = true;
							}
						}}
						class={roleEditDoa ? '' : 'hidden'}
					>
						<div class="flex flex-row bg-secondary p-2 gap-2 px-4 group">
							<img src="plus-white.svg" class="w-3 group-hover:rotate-[180deg] transition-all duration-1000" alt="" />
							<p class="text-white!">Tambah</p>
						</div>
					</div>
					<div>
						<div class="flex flex-row bg-[#677787] items-center group">
							<div class="bg-secondary p-2 px-3">
								<p class="text-white! min-w-6 min-h-6 flex items-center justify-center text-center">
									{#if loadingDrawer}
										<img src="spinner.svg?a" class="h-3.5! w-3.5!" alt="" />
									{:else}
										{filteredDoa.length}
									{/if}
								</p>
							</div>
							<p class="font-medium text-white! px-3">Total Dokumen</p>
						</div>
					</div>
					<div>
						<div class="relative w-full items-center group h-full">
							<img src="search-white.svg" class=" absolute top-1/2 left-3 h-4! w-4! -translate-y-1/2 group-hover:rotate-[90deg] transition-all duration-500" alt="" />
							<Input type="text" ref={searchRef} placeholder="Cari..." class="bg-[#677787]! search w-full rounded-none border-transparent! placeholder:text-[#fff]/50 h-full pl-11! text-[#fff]! focus:!border-transparent shadow-none! focus:!ring-transparent focus:!ring-offset-0" autofocus={true} bind:value={search} />
						</div>
					</div>
					<div
						class="flex gap-2"
						role="button"
						tabindex="0"
						onclick={() => {
							$mainTitle = group.find((t) => t.value === value)?.label || '';
							mbukakDoa = false;
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								$mainTitle = group.find((t) => t.value === value)?.label || '';
								mbukakDoa = false;
							}
						}}
					>
						<div>
							<div class="flex flex-row bg-[#677787] p-3.5 group">
								<img src="minimize-white.svg?a" class="w-3 group-hover:rotate-[180deg] transition-all duration-500" alt="" />
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="table-scroll-container">
				<Table.Root>
					<Table.Header class="shadow-none!">
						<Table.Row class="text-[#fff] bg-[#213C51]! sticky! top-0! z-20! text-white!">
							<Table.Head class="py-4! pl-4! cursor-pointer" onclick={() => handleSort('number')}>
								<div class="flex items-center gap-2 relative">
									<p class="text-white!">Nomor</p>
									{#if sortColumn === 'number'}
										<img src="down-white.svg" class="w-4 ms-1 relative right-1 transition-all {sortDirection === 'asc' ? '' : 'rotate-180'}" alt="" />
									{/if}
								</div>
							</Table.Head>
{#if filteredDoa.some(doa => doa.type === 'CVE' || doa.type === 'AWO' || doa.type === 'ass')}
							<Table.Head class="cursor-pointer " onclick={() => handleSort('nik')}>
								<div class="flex items-center gap-2 relative">
									<p class="text-white!">NIK</p>
									{#if sortColumn === 'nik'}
										<img src="down-white.svg" class="w-4 mx-1 relative right-1 transition-all {sortDirection === 'asc' ? '' : 'rotate-180'}" alt="" />
									{/if}
								</div>
							</Table.Head>
						{/if}
{#if filteredDoa.some(doa => doa.type === 'CVE' || doa.type === 'AWO' || doa.type === 'ass')}
							<Table.Head class="cursor-pointer " onclick={() => handleSort('nama')}>
								<div class="flex items-center gap-2 relative">
									<p class="text-white!">Nama</p>
									{#if sortColumn === 'nama'}
										<img src="down-white.svg" class="w-4 mx-1 relative right-2 transition-all {sortDirection === 'asc' ? '' : 'rotate-180'}" alt="" />
									{/if}
								</div>
							</Table.Head>
						{/if}
							<Table.Head class="cursor-pointer " onclick={() => handleSort('revision')}>
								<div class="flex items-center gap-2 relative">
									<p class="text-white!">Rev</p>
									{#if sortColumn === 'revision'}
										<img src="down-white.svg" class="w-4 mx-1 relative right-2 transition-all {sortDirection === 'asc' ? '' : 'rotate-180'}" alt="" />
									{/if}
								</div>
							</Table.Head>
							<Table.Head class="cursor-pointer " onclick={() => handleSort('date')}>
								<div class="flex items-center gap-2 relative">
									<p class="text-white!">Tanggal</p>
									{#if sortColumn === 'date'}
										<img src="down-white.svg" class="w-4 mx-1 relative right-2 transition-all {sortDirection === 'asc' ? '' : 'rotate-180'}" alt="" />
									{/if}
								</div>
							</Table.Head>
{#if filteredDoa.some(doa => doa.type === 'CVE' || doa.type === 'AWO' || doa.type === 'ass' || doa.type === 'cer')}
							<Table.Head class="cursor-pointer " onclick={() => handleSort('date2')}>
								<div class="flex items-center gap-2 relative">
									<p class="text-white!">Valid</p>
									{#if sortColumn === 'date2'}
										<img src="down-white.svg" class="w-4 mx-1 relative right-2 transition-all {sortDirection === 'asc' ? '' : 'rotate-180'}" alt="" />
									{/if}
								</div>
							</Table.Head>
						{/if}
							<Table.Head class="cursor-pointer " onclick={() => handleSort('title')}>
								<div class="flex items-center gap-2 relative">
									<p class="text-white!">Judul</p>
									{#if sortColumn === 'title'}
										<img src="down-white.svg" class="w-4 mx-1 relative right-2 transition-all {sortDirection === 'asc' ? '' : 'rotate-180'}" alt="" />
									{/if}
								</div>
							</Table.Head>
							<!-- <Table.Head class="text-end pr-4">-</Table.Head> -->
						</Table.Row>
					</Table.Header>
					<Table.Body class={loadingDrawer ? 'hidden' : 'visible'}>
						{#if filteredDoa}
							{#each filteredDoa as doa (doa.no)}
								<Table.Row class="group relative! border-0! hover:bg-[#fff]! hover:scale-[100.5%]! transition-all!">
									<Table.Cell class="font-medium! py-3! pl-4! w-1! select-text!">{doa.number || '-'}</Table.Cell>
{#if doa.type === 'CVE' || doa.type === 'AWO' || doa.type === 'ass'}
	<Table.Cell class="w-1! select-text!">{doa.nik || '-'}</Table.Cell>
{/if}
{#if doa.type === 'CVE' || doa.type === 'AWO' || doa.type === 'ass'}
	<Table.Cell class="w-1! select-text!">{doa.nama || '-'}</Table.Cell>
{/if}
									<Table.Cell class="w-1! select-text!">{doa.revision || '-'}</Table.Cell>
									<Table.Cell class="w-1! select-text!">{doa.date && !doa.date.includes('0000') ? doa.date : '-'}</Table.Cell>
{#if doa.type === 'CVE' || doa.type === 'AWO' || doa.type === 'ass'|| doa.type === 'cer'}
	<Table.Cell>{doa.date2 && !doa.date2.includes('1970-01-01') ? doa.date2 : '-'}</Table.Cell>
{/if}
									<Table.Cell class="max-w-[15vw] truncate select-text!" title={doa.title}>{doa.title || '-'}</Table.Cell>
									<div class="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
										<div
											class="bg-primary flex p-1.5 aspect-square border-1 border-secondary {roleEditDoa ? '' : 'hidden'}"
											role="button"
											tabindex="0"
											onclick={() => {
												anyar = false;
												selectedDoa = doa;
												$mainTitle = 'Edit DOA';
												mbukakTambahDoa = true;
											}}
											onkeydown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													anyar = false;
													selectedDoa = doa;
													$mainTitle = 'Edit DOA';
													mbukakTambahDoa = true;
												}
											}}
										>
											<img src="edit.svg" class="w-3.5" alt="" />
										</div>
										{#if doa.nmpath}
											<div
												role="button"
												tabindex="0"
												onclick={() => window.open(selectedDoaTitle && selectedDoaTitle.toUpperCase().includes('FORM') ? `http://portalditek.indonesian-aerospace.com/webdoa/${doa.pdf || doa.nmpath}` : `http://portalditek.indonesian-aerospace.com/webdoa/tcpdf/edm/watermark.php?ndm=${doa.nmpath.split('/').pop()}&nmpath=${doa.nmpath}&jdl=${encodeURIComponent(doa.title)}&kuid=${data.user.kuid}`, '_blank')}
												onkeydown={(e) => {
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault();
														window.open(selectedDoaTitle && selectedDoaTitle.toUpperCase().includes('FORM') ? `http://portalditek.indonesian-aerospace.com/webdoa/${doa.pdf || doa.nmpath}` : `http://portalditek.indonesian-aerospace.com/webdoa/tcpdf/edm/watermark.php?ndm=${doa.nmpath.split('/').pop()}&nmpath=${doa.nmpath}&jdl=${encodeURIComponent(doa.title)}&kuid=${data.user.kuid}`, '_blank');
													}
												}}
												class="bg-primary flex p-1.5 aspect-square border-1 border-secondary cursor-pointer"
											>
												<img src="download.svg" class="w-3.5" alt="" />
											</div>
										{/if}
									</div>
								</Table.Row>
							{/each}
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
		</div>
	</Drawer.Content>
</Drawer.Root>

<!-- @b tambah doa -->
{#if roleEditDoa}
	<Drawer.Root
		bind:open={mbukakTambahDoa}
		direction="right"
		onClose={() => {
			if (mbukakDoa) {
				$mainTitle = selectedDoaTitle;
			} else {
				$mainTitle = group.find((t) => t.value === value)?.label || '';
			}
			fileInputDoa = null;
		}}
	>
		<Drawer.Content class="bg-[#fff]! min-h-0!">
			<ScrollArea scrollbarYClasses="hidden" class="el relative! flex! items-center! px-4! gap-2! h-full! min-h-0! flex-col!" orientation="vertical" type="scroll" data-vaul-no-drag>
				<div class="w-full flex justify-between pt-4">
					<div>
						<div class="flex flex-row bg-[#213C51] p-2 px-3 gap-2 group">
							<img src="plus-white.svg?f" class="w-4" alt="" />
							<p class="font-medium text-white!">Tambah DOA</p>
						</div>
					</div>

					<div
						class="flex gap-2"
						role="button"
						tabindex="0"
						onclick={() => {
							if (mbukakDoa) {
								$mainTitle = selectedDoaTitle;
							} else {
								$mainTitle = group.find((t) => t.value === value)?.label || '';
							}
							mbukakTambahDoa = false;
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								if (mbukakDoa) {
									$mainTitle = selectedDoaTitle;
								} else {
									$mainTitle = group.find((t) => t.value === value)?.label || '';
								}
								mbukakTambahDoa = false;
							}
						}}
					>
						<div>
							<div class="flex flex-row bg-[#213C51] p-3.5 group">
								<img src="minimize-white.svg?a" class="w-3 group-hover:rotate-[180deg] transition-all duration-500" alt="" />
							</div>
						</div>
					</div>
				</div>

					<div class="flex flex-col gap-1">
						<p class="font-medium">Tipe</p>
						<!-- <div class="relative w-full items-center">
						<img src="type.svg" class=" absolute top-1/2 left-3 h-4! w-4! -translate-y-1/2" alt="" />
						<Input type="text" placeholder="Pilih Tipe" class="w-full rounded-none bg-[#fff] border-transparent! placeholder:text-secondary/35 py-7! pl-11! text-base! focus:!border-transparent shadow-none! focus:!ring-transparent focus:!ring-offset-0" autofocus={false} />
					</div> -->

						<Select.Root type="single" name="favoriteFruit" bind:value={selectedDoa.type}>
							<Select.Trigger placeholder="Pilih Tipe" class="flex! relative! pl-11! flex-row! bg-[#fff]! py-7! px-3! w-full! gap-3! group shadow-none! overflow-hidden! border-1! border-[#000]! rounded-none!">
								<img src="type.svg" class=" absolute top-1/2 left-3 h-4! w-4! -translate-y-1/2" alt="" />
								<p title={subtypes.find((t) => t.value === selectedDoa.type)?.label || 'Pilih Tipe'} class="text-base max-w-[19dvw] truncate {selectedDoa.type === '0' ? 'text-secondary/35!' : 'text-secondary!'}">{subtypes.find((t) => t.value === selectedDoa.type)?.label || 'Pilih Tipe'}</p>
								<!-- <img src="down.svg" class="w-2 pt-1" alt="" /> -->
							</Select.Trigger>
							<Select.Content class="mb-2! h-[50dvh]! rounded-none! shadow-none! border-0! bg-[#fff]! border-1! border-[#000]! p-0! z-[100]!">
								<Select.Group>
									<!-- <Select.Label>Fruits</Select.Label> -->
									{#each subtypes as subtypes (subtypes.value)}
										<Select.Item class="rounded-none shadow-none px-3 py-3 border-0 hover:bg-transparent! bg-transparent active:bg-transparent!" value={subtypes.value} label={subtypes.label}>
											<img src="type.svg" class="w-3 ml-2 mr-2 group-hover:rotate-[-45deg] transition-all duration-500" alt="" />
											<p class="text-base max-w-[19dvw] truncate" title={subtypes.label}>{subtypes.label}</p>
										</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</div>

				<div class="w-full pt-4 flex flex-col gap-2 pb-4">
					<div class="flex flex-col gap-1">
						<p class="font-medium">Judul</p>
						<div class="relative w-full items-center">
							<img src="document.svg" class=" absolute top-1/2 left-3 h-5! w-5! -translate-y-1/2" alt="" />
							<Input type="text" placeholder="Masukkan Judul" class="w-full rounded-none bg-[#fff] border-[#000]! placeholder:text-secondary/35 py-7! pl-11! text-base! shadow-none! focus:!ring-transparent focus:!ring-offset-0" autofocus={false} bind:value={selectedDoa.title} />
						</div>
					</div>

					<div class="flex flex-col gap-1">
						<p class="font-medium">Nomor</p>
						<div class="relative w-full items-center">
							<img src="number.svg?b" class=" absolute top-1/2 left-3 h-5! w-5! -translate-y-1/2" alt="" />
							<Input type="text" placeholder="Nomor" class="w-full rounded-none bg-[#fff] border-[#000]! placeholder:text-secondary/35 py-7! pl-11! text-base! shadow-none! focus:!ring-transparent focus:!ring-offset-0" autofocus={false} bind:value={selectedDoa.number} />
						</div>
					</div>

					<div class="flex flex-col gap-1">
						<p class="font-medium">Revisi</p>
						<div class="relative w-full items-center">
							<img src="beat.svg" class=" absolute top-1/2 left-3 h-4! w-4! -translate-y-1/2" alt="" />
							<Input type="text" placeholder="Revisi" class="w-full rounded-none bg-[#fff] border-[#000]! placeholder:text-secondary/35 py-7! pl-11! text-base! shadow-none! focus:!ring-transparent focus:!ring-offset-0" autofocus={false} bind:value={selectedDoa.revision} />
						</div>
					</div>

					<div class="flex flex-col gap-1">
						<p class="font-medium">Dokumen</p>
						<div class="relative w-full items-center w-full! rounded-none! border-1! bg-[#fff]! flex! items-center! border-[#000]! placeholder:text-secondary/35 py-2.5! pl-8! text-base! focus:!border-[#000]! shadow-none! focus:!ring-transparent focus:!ring-offset-0">
							<img src="clip.svg" class=" absolute top-1/2 left-3 h-4! w-4! -translate-y-1/2" alt="" />
							<Input accept=".doc,.docx,.pdf" type="file" placeholder="Upload Dokumen" class="border-0! rounded-0! border-[#000]! shadow-none! focus:!ring-transparent pt-2 focus:!ring-offset-0" autofocus={false} bind:files={fileInputDoa} />
						</div>
					</div>

					<div class="flex flex-col gap-3">
						<p class="font-medium">Tanggal</p>
						<Popover.Root bind:open={openTanggal}>
							<Popover.Trigger id="{id}-date" class="border-1! border-[#000]! relative w-full items-center w-full! rounded-none! bg-[#fff]! flex! items-center! placeholder:text-secondary/35 py-4! pl-11! text-base! shadow-none! focus:!ring-transparent focus:!ring-offset-0">
								{#snippet child({ props })}
									<div {...props}>
										<img src="date.svg" class=" absolute top-1/2 left-3 h-5! w-5! -translate-y-1/2" alt="" />
										<div class="border-0! rounded-0! focus:!border-transparent shadow-none! focus:!ring-transparent focus:!ring-offset-0 {selectedDoa.date ? '' : 'text-secondary/50!'}">{selectedDoa.date ? selectedDoa.date.toString() : 'Pilih Tanggal'}</div>
									</div>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="mb-3! rounded-none! shadow-none! bg-[#fff]! border-1! border-[#000]! p-2!">
								<Calendar
									type="single"
									bind:value={selectedDoa.date}
									captionLayout="dropdown"
									locale="id"
									onValueChange={() => {
										openTanggal = false;
									}}
								/>
							</Popover.Content>
						</Popover.Root>
					</div>
					
					{#if selectedDoa.type === 'CVE' || selectedDoa.type === 'AWO' || selectedDoa.type === 'ass' || selectedDoa.type === 'cer'}
					<div class="flex flex-col gap-3">
						<p class="font-medium">Valid</p>
						<Popover.Root bind:open={openValid}>
							<Popover.Trigger id="{id}-date" class="border-1! border-[#000]! relative w-full items-center w-full! rounded-none! bg-[#fff]! flex! items-center! placeholder:text-secondary/35 py-4! pl-11! text-base! focus:!border-[#000]! shadow-none! focus:!ring-transparent focus:!ring-offset-0">
								{#snippet child({ props })}
									<div {...props}>
										<img src="date valid.svg" class=" absolute top-1/2 left-3 h-5! w-5! -translate-y-1/2" alt="" />
										<div class="border-0! rounded-0! focus:!border-[#000] shadow-none! focus:!ring-transparent focus:!ring-offset-0 {selectedDoa.date2 ? '' : 'text-secondary/50!'}">{selectedDoa.date2 ? selectedDoa.date2.toString() : 'Pilih Tanggal'}</div>
									</div>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="mb-3! rounded-none! shadow-none! bg-[#fff]! border-1! border-[#000]! p-2!">
								<Calendar
									type="single"
									bind:value={selectedDoa.date2}
									captionLayout="dropdown"
									locale="id"
									onValueChange={() => {
										openValid = false;
									}}
								/>
							</Popover.Content>
						</Popover.Root>
					</div>
					{/if}

					<!-- <div class="flex w-full flex-col justify-center gap-1 text-left">
					<p class="font-medium">Remarks</p>
					<div class="relative w-full items-center">
						<img src="note.svg" class=" absolute top-1/2 left-3 h-4! w-4! -translate-y-1/2" alt="" />
						<Textarea placeholder="Tambahkan Remarks" class="resize-none! bg-primary/50 border-transparent! rounded-none placeholder:text-secondary/35 py-4! pr-4! pl-12! text-base! focus:!border-transparent shadow-none! focus:!ring-transparent focus:!ring-offset-0   xl:text-base" autofocus={false} />
					</div>
				</div> -->
				</div>
			</ScrollArea>
			{#if anyar}
				<div>
					<div
						class="flex w-full justify-center items-center py-4 text-center bg-secondary p-2 px-3 gap-2 group"
						role="button"
						tabindex="0"
						onclick={() => fDoa(false)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								fDoa(false);
							}
						}}
					>
						{#if loadingInput}
							<img src="spinner.svg?a" class="h-5! w-5! mt-1" alt="" />
						{:else}
							<p class="font-medium !text-white">Tambah</p>
						{/if}
					</div>
				</div>
			{:else}
				<div class="flex">
					<div
						class="flex w-1/3 justify-center items-center py-4 text-center bg-red-900 p-2 px-3 gap-2 group"
						role="button"
						tabindex="0"
						onclick={() => fDoa(true)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								fDoa(true);
							}
						}}
					>
						{#if loadingInput}
							<img src="spinner.svg?a" class="h-5! w-5! mt-1" alt="" />
						{:else}
							<p class="font-medium !text-white">Hapus</p>
						{/if}
					</div>
					<div
						class="flex w-2/3 justify-center items-center py-4 text-center bg-secondary p-2 px-3 gap-2 group"
						role="button"
						tabindex="0"
						onclick={() => fDoa(false)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								fDoa(false);
							}
						}}
					>
						{#if loadingInput}
							<img src="spinner.svg?a" class="h-5! w-5! mt-1" alt="" />
						{:else}
							<p class="font-medium !text-white">Ubah</p>
						{/if}
					</div>
				</div>
			{/if}
		</Drawer.Content>
	</Drawer.Root>
{/if}
<!-- @b users -->
{#if roleUser}
	<Drawer.Root
		bind:open={mbukakUsers}
		onClose={() => {
			data = { ...data, doa_selected: [], users: [] };
			$mainTitle = group.find((t) => t.value === value)?.label || '';
		}}
	>
		<Drawer.Content class="bg-[#fff]/95! min-h-[95dvh]! flex! items-center!">
			<div class="h-screen w-screen z-50 absolute {loadingDrawer ? 'block' : 'hidden'}"><img src="spinner_color.svg?a" class=" h-5! w-5! absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" alt="" /></div>
			<div class="w-11/12 pt-12 gap-2 flex flex-col">
				<div class="w-full flex justify-between">
					<div>
						<div class="flex flex-row bg-[#677787] p-2 px-3 gap-2 group">
							<img src="users3-white.svg?f" class="w-4" alt="" />
							<p class="font-medium text-white!">Daftar User</p>
						</div>
					</div>

					<div class="flex gap-2">
						<div>
							<div class="flex flex-row bg-[#677787] items-center group">
								<div class="bg-secondary p-2 px-3">
								<p class="text-white! min-w-6 min-h-6 flex items-center justify-center text-center">
									{#if loadingDrawer}
										<img src="spinner.svg?a" class="h-3.5! w-3.5!" alt="" />
									{:else}
										{filteredUsers.length}
									{/if}
								</p>
								</div>
								<p class="font-medium text-white! px-3">Total User</p>
							</div>
						</div>
						<div>
							<!-- <div class="relative flex flex-row bg-[#677787] p-3 group">
							<img src="search.svg" class="w-4 group-hover:rotate-[90deg] transition-all duration-500" alt="" />
							<div class="bg-secondary w-2 h-2 absolute -right-0.5 -top-0.5"></div>
						</div> -->
							<div class="relative w-full items-center group h-full">
								<img src="search-white.svg" class="absolute top-1/2 left-3 h-4! w-4! -translate-y-1/2 group-hover:rotate-[90deg] transition-all duration-500" alt="" />
								<Input type="text" placeholder="Cari..." ref={searchRef} class="bg-[#677787]! search w-full rounded-none border-transparent! placeholder:text-[#fff]/50 h-full pl-11! text-[#fff]! focus:!border-transparent shadow-none! focus:!ring-transparent focus:!ring-offset-0" autofocus={true} bind:value={search} />
							</div>
						</div>
						<div
							class="flex gap-2"
							role="button"
							tabindex="0"
							onclick={() => {
								$mainTitle = group.find((t) => t.value === value)?.label || '';
								mbukakUsers = false;
							}}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									$mainTitle = group.find((t) => t.value === value)?.label || '';
									mbukakUsers = false;
								}
							}}
						>
							<div>
								<div class="flex flex-row bg-[#677787] p-3.5 group">
									<img src="minimize-white.svg?a" class="w-3 group-hover:rotate-[180deg] transition-all duration-500" alt="" />
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="table-scroll-container">
					<Table.Root>
						<Table.Header class="shadow-none!">
							<Table.Row class="bg-[#213C51]! sticky! top-0! z-20!">
								<Table.Head class="py-4! pl-4! cursor-pointer " onclick={() => handleSortUser('activated')}>
									<div class="flex items-center gap-2 relative">
										<p class="text-white!">Status</p>
										{#if sortColumnUser === 'activated'}
											<img src="down-white.svg" class="w-4 mx-1 relative right-2 transition-all {sortDirectionUser === 'asc' ? '' : 'rotate-180'}" alt="" />
										{/if}
									</div>
								</Table.Head>
								<Table.Head class="text-center! cursor-pointer " onclick={() => handleSortUser('username')}>
									<div class="flex items-center justify-start gap-2 relative">
										<p class="text-white!">NIK</p>
										{#if sortColumnUser === 'username'}
											<img src="down-white.svg" class="w-4 mx-1 relative right-2 transition-all {sortDirectionUser === 'asc' ? '' : 'rotate-180'}" alt="" />
										{/if}
									</div>
								</Table.Head>
								<Table.Head class="cursor-pointer " onclick={() => handleSortUser('configPenghasil')}>
									<div class="flex items-center gap-2 relative">
										<p class="text-white!">Nama</p>
										{#if sortColumnUser === 'configPenghasil'}
											<img src="down-white.svg" class="w-4 mx-1 relative right-2 transition-all {sortDirectionUser === 'asc' ? '' : 'rotate-180'}" alt="" />
										{/if}
									</div>
								</Table.Head>
								<!-- <Table.Head>Organisasi</Table.Head> -->
								<Table.Head class="cursor-pointer " onclick={() => handleSortUser('userlevel_name')}>
									<div class="flex items-center gap-2 relative">
										<p class="text-white!">User Level</p>
										{#if sortColumnUser === 'userlevel_name'}
											<img src="down-white.svg" class="w-4 relative right-2 transition-all {sortDirectionUser === 'asc' ? '' : 'rotate-180'}" alt="" />
										{/if}
									</div>
								</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body class={loadingDrawer ? 'hidden' : 'visible'}>
							{#if filteredUsers}
								{#each filteredUsers as userx (userx.kuid)}
									<!-- {"username":"160238","kuid":"c054e296693e2c4eb00c371ad632fdc4","password":"6d2f4baaaee3f763980805bad0363546","userlevel":1,"provinsi":"","configPenghasil":"Dimas Septa","activated":"Y"}, -->
									<Table.Row class="group relative! border-0! hover:bg-[#fff]! hover:scale-[100.5%]! transition-all!">
										<Table.Cell class="font-medium pl-4! w-1! justify-center! items-center!">
											{#if userx.userlevel == '0'}
												<div class="bg-orange-500/10 py-0.5 flex items-center gap-1 px-1.5 text-center flex w-min">
													<div class="bg-orange-600! rounded-full w-1 h-1"></div>
													<span class="text-xs text-orange-600!">Aktivasi</span>
												</div>
											{:else if userx.activated === 'Aktif'}
												<div class="bg-green-500/10 py-0.5 flex items-center gap-1 px-1.5 text-center flex w-min">
													<div class="bg-green-600! rounded-full w-1 h-1"></div>
													<span class="text-xs text-green-600!">Aktif</span>
												</div>
											{:else}
												<div class="bg-gray-500/10 py-0.5 flex items-center gap-1 px-1.5 text-center flex w-min">
													<div class="bg-gray-600! rounded-full w-1 h-1"></div>
													<span class="text-xs text-gray-600!">Nonaktif</span>
												</div>
											{/if}
										</Table.Cell>
										<Table.Cell class="text-start! w-1/8! select-text!">{userx.username}</Table.Cell>
										<Table.Cell class="select-text!">{userx.configPenghasil}</Table.Cell>
										<Table.Cell class="w-1/6! select-text!">{userx.userlevel_name}</Table.Cell>
										<div
											class="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all"
											role="button"
											tabindex="0"
											onclick={() => {
												selectedUser = userx;
												selectedUserLevel = userx.userlevel.toString();
												selectedUser.password = '';
												// selectedUserLevel = '0';
												// search = '';
												// console.log(userx);
												$mainTitle = 'Edit User';
												mbukakEditUser = true;
											}}
											onkeydown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													selectedUser = userx;
													selectedUserLevel = userx.userlevel.toString();
													selectedUser.password = '';
													$mainTitle = 'Edit User';
													mbukakEditUser = true;
												}
											}}
										>
											{#if userx.userlevel}
												<!-- <img src="copy.svg" class="w-3" alt="" /> -->
												<div class="bg-primary flex p-1.5 aspect-square border-1 border-secondary"><img src="edit.svg" class="w-3.5" alt="" /></div>
											{:else}
												<p class="text-xs font-medium bg-primary px-2 py-1 rounded-none border-1 border-secondary">Aktivasi</p>
											{/if}
										</div>
									</Table.Row>
								{/each}
							{/if}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		</Drawer.Content>
	</Drawer.Root>

	<!-- @b edit user -->
	<Drawer.Root
		bind:open={mbukakEditUser}
		direction="right"
		onClose={() => {
			$mainTitle = 'Daftar User';
		}}
	>
		<Drawer.Content class="bg-[#fff]! min-h-0!">
			<ScrollArea scrollbarYClasses="hidden" class="el relative! flex! items-center! px-4! gap-2! h-full! min-h-0! flex-col!" orientation="vertical" type="scroll" data-vaul-no-drag>
				<div class="w-full flex justify-between pt-4">
					<div>
						<div class="flex flex-row bg-[#213C51] p-2 px-3 gap-2 group">
							<img src="user-white.svg?f" class="w-4" alt="" />
							<p class="font-medium text-white!">Edit User</p>
						</div>
					</div>

					<div
						class="flex gap-2"
						role="button"
						tabindex="0"
						onclick={() => {
							$mainTitle = 'Daftar User';
							mbukakTambahDoa = false;
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								$mainTitle = 'Daftar User';
								mbukakTambahDoa = false;
							}
						}}
					>
						<div>
							<div class="flex flex-row bg-[#213C51] p-3.5 group">
								<img src="minimize-white.svg?a" class="w-3 group-hover:rotate-[180deg] transition-all duration-500" alt="" />
							</div>
						</div>
					</div>
				</div>

				<div class="w-full pt-4 flex flex-col gap-2 pb-4">
					<div class="flex flex-col gap-1">
						<p class="font-medium">NIK</p>
						<div class="relative w-full items-center">
							<img src="nik.svg?a" class=" absolute top-1/2 left-3 h-5! w-5! -translate-y-1/2" alt="" />
							<Input type="text" class="w-full rounded-none bg-primary/50 border-[#000]! placeholder:text-secondary/35 py-7! pl-11! text-base! focus:!border-transparent shadow-none! focus:!ring-transparent focus:!ring-offset-0" autofocus={false} bind:value={selectedUser.username} disabled />
						</div>
					</div>

					<div class="flex flex-col gap-1">
						<p class="font-medium">Nama</p>
						<div class="relative w-full items-center">
							<img src="name.svg?a" class=" absolute top-1/2 left-3 h-5! w-5! -translate-y-1/2" alt="" />
							<Input type="text" class="w-full rounded-none bg-primary/50 border-[#000]! placeholder:text-secondary/35 py-7! pl-11! text-base! focus:!border-transparent shadow-none! focus:!ring-transparent focus:!ring-offset-0" bind:value={selectedUser.configPenghasil} autofocus={false} disabled />
						</div>
					</div>

					<div class="flex flex-col gap-1">
						<p class="font-medium">User Level</p>
						<Select.Root type="single" name="favoriteFruit" bind:value={selectedUser.userlevel}>
							<Select.Trigger placeholder="Pilih User Level" class="flex! relative! pl-11! flex-row! bg-primary/50! py-7! px-3! w-full! gap-3! group shadow-none! overflow-hidden! border-1! border-[#000]! rounded-none!">
								<img src="working arrangement.svg" class=" absolute top-1/2 left-3 h-4! w-4! -translate-y-1/2" alt="" />
								<p class="text-base {selectedUser.userlevel === 0 ? 'text-secondary/35!' : 'text-secondary!'}">{userlevels.find((t) => t.value === selectedUser.userlevel)?.label || 'Pilih User Level'}</p>
								<!-- <img src="down.svg" class="w-2 pt-1" alt="" /> -->
							</Select.Trigger>
							<Select.Content class="mb-2! rounded-none! shadow-none! border-0! bg-[#fff]! border-1! border-[#000]! p-0! z-[100]!">
								<Select.Group>
									<!-- <Select.Label>Fruits</Select.Label> -->
									{#each userlevels as userlevels (userlevels.value)}
										<Select.Item class="rounded-none shadow-none px-3 py-3 border-0 hover:bg-[#000]/25! bg-transparent active:bg-transparent!" value={userlevels.value} label={userlevels.label}>
											<img src="working arrangement.svg" class="w-3 ml-2 mr-2 group-hover:rotate-[-45deg] transition-all duration-500" alt="" />
											<p class="text-base">{userlevels.label}</p>
										</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</div>

					<div class="flex flex-col gap-1">
						<p class="font-medium">Password</p>
						<div class="relative w-full items-center">
							<img src="pass.svg?a" class=" absolute top-1/2 left-3 h-5! w-5! -translate-y-1/2" alt="" />
							<Input bind:value={selectedUser.password} type="password" placeholder="Tidak Diubah" class="w-full rounded-none bg-primary/50 border-[#000]! placeholder:text-secondary/35 py-7! pl-11! text-base! focus:!border-transparent shadow-none! focus:!ring-transparent focus:!ring-offset-0" autofocus={false} />
						</div>
					</div>

					<div class="flex w-full flex-col justify-center gap-1 text-left">
						<p class="font-medium">Status Akun</p>
						<RadioGroup.Root bind:value={selectedUser.activated}>
							<Label class="flex items-start gap-3 rounded-none border p-3 border-black/10 has-[[aria-checked=true]]:border-secondary has-[[aria-checked=true]]:bg-primary/50">
								<RadioGroup.Item value="Aktif" id="toggle-2" class="data-[state=checked]:bg-secondary data-[state=checked]:text-white shadow-none! border-none! bg-black/10 rounded-full" />
								<div class="grid gap-1.5 font-normal">
									<p class="text-sm leading-none font-medium">Aktif</p>
									<p class="text-secondary/75! text-sm">Status akun menjadi aktif memungkinkan pengguna untuk login dan menggunakan semua fitur aplikasi DOA.</p>
								</div>
							</Label>

							<Label class="flex items-start gap-3 rounded-none border p-3 border-black/10 has-aria-checked:border-secondary has-aria-checked:bg-primary/50">
								<RadioGroup.Item value="Nonaktif" id="toggle-2" class="data-[state=checked]:bg-secondary data-[state=checked]:text-white shadow-none! border-none! bg-black/10 rounded-full" />
								<div class="grid gap-1.5 font-normal">
									<p class="text-sm leading-none font-medium">Nonaktif</p>
									<p class="text-secondary/75! text-sm">Status akun menjadi nonaktif pengguna tidak dapat login dan tidak dapat menggunakan fitur aplikasi DOA.</p>
								</div>
							</Label>
						</RadioGroup.Root>
					</div>
				</div>
			</ScrollArea>
			<div class="flex">
				<div
					class="flex w-1/3 justify-center items-center py-4 text-center bg-red-900 p-2 px-3 gap-2 group"
					role="button"
					tabindex="0"
					onclick={() => fUser(true)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							fUser(true);
						}
					}}
				>
					{#if loadingInput}
						<img src="spinner.svg?a" class="h-5! w-5! mt-1" alt="" />
					{:else}
						<p class="font-medium !text-white">Hapus</p>
					{/if}
				</div>
				<div
					class="flex w-2/3 justify-center items-center py-4 text-center bg-secondary p-2 px-3 gap-2 group"
					role="button"
					tabindex="0"
					onclick={() => fUser(false)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							fUser(false);
						}
					}}
				>
					{#if loadingInput}
						<img src="spinner.svg?a" class="h-5! w-5! mt-1" alt="" />
					{:else}
						<p class="font-medium !text-white">Ubah</p>
					{/if}
				</div>
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}