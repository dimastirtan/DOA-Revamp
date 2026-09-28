import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { standard } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';

// Role divisi (docs/divisi_design.md). userlevel divisi = kunci divisi.
const DIVISI_LABEL: Record<number, string> = {
	6: 'Program Management',
	7: 'Manajemen Resiko',
	8: 'Human Capital',
	9: 'Direktorat Produksi'
};
const isDivisi = (lvl: unknown): lvl is number => typeof lvl === 'number' && lvl >= 6;

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	const userlevel = user?.userlevel;
	let def = 'aircraft';
	let single = false;

	const data = await request.json();

	// Search functionality (data.s)
	if (data.s) {
		const searchPattern = `%${data.s}%`;
		let whereClause = sql`(${standard.no} LIKE ${searchPattern} OR 
					${standard.number} LIKE ${searchPattern} OR 
					${standard.date} LIKE ${searchPattern} OR 
					${standard.date2} LIKE ${searchPattern} OR 
					${standard.title} LIKE ${searchPattern} OR 
					${standard.revision} LIKE ${searchPattern} OR 
					${standard.panel} LIKE ${searchPattern} OR 
					${standard.nik} LIKE ${searchPattern} OR 
					${standard.nama} LIKE ${searchPattern}) AND ${standard.remark} != 'D'`;

		if (userlevel === 2) {
			whereClause = sql`${whereClause} AND ${standard.type} IN ('cmd', 'man', 'pro', 'wi', 'wa', 'WA', 'WA ')`;
		} else if (userlevel === 3) {
			whereClause = sql`${whereClause} AND ${standard.type} IN ('cer2', 'man2', 'pro2', 'wi2', 'doc2', 'cp', 'tm', 'qp2', 'QP2', '41N', 'form2')`;
		} else if (isDivisi(userlevel)) {
			// Divisi: hanya procedure (pro/pro2) yang dipetakan ke divisinya.
			whereClause = sql`${whereClause} AND ${standard.type} IN ('pro', 'pro2') AND ${standard.no} IN (SELECT standard_no FROM procedure_division WHERE division = ${userlevel} AND remark <> 'D')`;
		}

		const results = await db.select().from(standard).where(whereClause);
		return json(results);
	}

	// Filter by type functionality (data.t)
	if (data.t) {
		if (isDivisi(userlevel)) {
			// Divisi hanya punya satu "tipe" semu: 'divisi' = semua procedure
			// (pro+pro2) yang dipetakan ke divisinya. Sentinel lain → kosong.
			if (data.t !== 'divisi') return json([]);
			const results = await db
				.select()
				.from(standard)
				.where(
					sql`${standard.type} IN ('pro', 'pro2') AND ${standard.remark} != 'D' AND ${standard.no} IN (SELECT standard_no FROM procedure_division WHERE division = ${userlevel} AND remark <> 'D')`
				);
			return json(results);
		}
		if (userlevel === 2) {
			const allowed = ['cmd', 'man', 'pro', 'wi', 'wa', 'WA', 'WA '];
			if (!allowed.includes(data.t)) return json([]);
		} else if (userlevel === 3) {
			const allowed = ['cer2', 'man2', 'pro2', 'wi2', 'doc2', 'cp', 'tm', 'qp2', 'QP2', '41N', 'form2'];
			if (!allowed.includes(data.t)) return json([]);
		}

		const results = await db
			.select()
			.from(standard)
			.where(sql`${standard.type} = ${data.t} AND ${standard.remark} != 'D'`);
		return json(results);
	}

	// Divisi (userlevel 6-9): tampilan single "divisi", hanya kartu PROCEDURE
	// berisi jumlah procedure yang dipetakan ke divisinya (pro+pro2).
	if (isDivisi(userlevel)) {
		const cnt = await db
			.select({ c: sql<number>`count(*)` })
			.from(standard)
			.where(
				sql`${standard.type} IN ('pro', 'pro2') AND ${standard.remark} <> 'D' AND ${standard.no} IN (SELECT standard_no FROM procedure_division WHERE division = ${userlevel} AND remark <> 'D')`
			);
		const total = Number(cnt[0]?.c ?? 0);
		return json({
			def: 'divisi',
			single: true,
			divisiLabel: DIVISI_LABEL[userlevel] ?? 'Divisi',
			divisi: [{ name: 'PROCEDURE', type: 'divisi', total: String(total) }],
			aircraft: [],
			non_aircraft: []
		});
	}

	// Default functionality (stats)
	const counts = await db
		.select({
			type: standard.type,
			count: sql<number>`count(*)`
		})
		.from(standard)
		.where(sql`${standard.remark} != 'D'`)
		.groupBy(standard.type);

	// Convert to a map for easy lookup
	const countMap: Record<string, number> = {};
	counts.forEach((item) => {
		if (item.type) {
			countMap[item.type] = Number(item.count);
		}
	});

	const getCount = (type: string) => countMap[type] || 0;

	// Helper to format number (similar to PHP number_format 0 decimals, which is default for integers)
	const fmt = (n: number) => n.toString();

	let aircraft = [
		{
			name: 'CERTIFICATE',
			type: 'cer',
			total: fmt(getCount('cer'))
		},
		{
			name: 'COMMAND MEDIA',
			type: 'cmd',
			total: fmt(getCount('cmd'))
		},
		{
			name: 'MANUAL',
			type: 'man',
			total: fmt(getCount('man'))
		},
		{
			name: 'PROCEDURE',
			type: 'pro',
			total: fmt(getCount('pro'))
		},
		{
			name: 'WORK INSTRUCTION',
			type: 'wi',
			total: fmt(getCount('wi'))
		},
		{
			name: 'DOCUMENT',
			type: 'doc',
			total: fmt(getCount('doc'))
		},
		{
			name: 'PERSONNEL ASSIGNMENT',
			total: fmt(getCount('CVE') + getCount('AWO') + getCount('ass')),
			sub: [
				{
					name: 'CVE',
					type: 'CVE',
					total: fmt(getCount('CVE'))
				},
				{
					name: 'AWO',
					type: 'AWO',
					total: fmt(getCount('AWO'))
				}
			]
		},
		{
			name: 'ENGINEERING STANDARD',
			total: fmt(
				getCount('41A') +
					getCount('41B') +
					getCount('41C-1') +
					getCount('41C-2') +
					getCount('41C-3') +
					getCount('41D') +
					getCount('41E') +
					getCount('41F') +
					getCount('41G') +
					getCount('41H') +
					getCount('41I') +
					getCount('mtm')
			),
			sub: [
				{
					name: 'PART 41A Design Standard Manual (NDM)',
					type: '41A',
					total: fmt(getCount('41A'))
				},
				{
					name: 'PART 41B Drafting Standard Manual (NDS)',
					type: '41B',
					total: fmt(getCount('41B'))
				},
				{
					name: 'PART 41C NPS-Mark & Label',
					type: '41C-1',
					total: fmt(getCount('41C-1'))
				},
				{
					name: 'PART 41C NPS-Part',
					type: '41C-2',
					total: fmt(getCount('41C-2'))
				},
				{
					name: 'PART 41C NPS-Profile',
					type: '41C-3',
					total: fmt(getCount('41C-3'))
				},
				{
					name: 'PART 41D Process Specification Manual (PS20)',
					type: '41D',
					total: fmt(getCount('41D'))
				},
				{
					name: 'PART 41E Material Standard Manual (IMS)',
					type: '41E',
					total: fmt(getCount('41E'))
				},
				{
					name: 'PART 41F Design Checklist Standard Manual (DCL)',
					type: '41F',
					total: fmt(getCount('41F'))
				},
				{
					name: 'PART 41G Computation/Software Standard Manual (NCS)',
					type: '41G',
					total: fmt(getCount('41G'))
				},
				{
					name: 'PART 41H Material Specification Standard Manual (NMS)',
					type: '41H',
					total: fmt(getCount('41H'))
				},
				{
					name: 'PART 41I Support Specification Standard Manual (NSS)',
					type: '41I',
					total: fmt(getCount('41I'))
				},
				{
					name: 'Material Test Method (MTM)',
					type: 'mtm',
					total: fmt(getCount('mtm'))
				}
			]
		},
		{
			name: 'WORKING ARRANGEMENT',
			type: 'wa',
			total: fmt(getCount('wa') + getCount('WA') + getCount('WA '))
		},
		{
			name: 'QUALITY PLAN',
			type: 'qp1',
			total: fmt(getCount('qp1') + getCount('QP1'))
		},
		{
			name: 'SPECIFICATION',
			type: 'lib',
			total: fmt(getCount('lib'))
		},
		{
			name: 'FORM',
			type: 'standard', // Based on PHP link type=standard
			total: fmt(getCount('standard'))
		}
	];

	let non_aircraft = [
		{
			name: 'CERTIFICATE',
			type: 'cer2',
			total: fmt(getCount('cer2'))
		},
		{
			name: 'MANUAL',
			type: 'man2',
			total: fmt(getCount('man2'))
		},
		{
			name: 'PROCEDURE',
			type: 'pro2',
			total: fmt(getCount('pro2'))
		},
		{
			name: 'WORK INSTRUCTION',
			type: 'wi2',
			total: fmt(getCount('wi2'))
		},
		{
			name: 'DOCUMENT',
			type: 'doc2',
			total: fmt(getCount('doc2'))
		},
		{
			name: 'CERTIFICATION PROCEDURE',
			type: 'cp',
			total: fmt(getCount('cp'))
		},
		{
			name: 'TEST METHOD',
			type: 'tm',
			total: fmt(getCount('tm'))
		},
		{
			name: 'WORKING ARRANGEMENT & QUALITY PLAN',
			type: 'qp2', // Combined in label, but type=qp2
			total: fmt(getCount('qp2') + getCount('QP2'))
		},
		{
			name: 'ENGINEERING STANDARD',
			total: fmt(getCount('41N')),
			sub: [
				{
					name: 'PART 41N Standard Non Aircraft',
					type: '41N',
					total: fmt(getCount('41N'))
				}
			]
		},
		{
			name: 'FORM',
			type: 'form2',
			total: fmt(getCount('form2'))
		}
	];

	if (userlevel === 2) {
		def = 'aircraft';
		single = true;
		const selectedList = [
			'COMMAND MEDIA',
			'MANUAL',
			'PROCEDURE',
			'WORK INSTRUCTION',
			'WORKING ARRANGEMENT'
		];
		aircraft = aircraft.filter((item) => selectedList.includes(item.name));
		non_aircraft = [];
	} else if (userlevel === 3) {
		single = true;
		def = 'non_aircraft';
		aircraft = [];
	}

	return json({
		def,
		single,
		aircraft,
		non_aircraft
	});
};
