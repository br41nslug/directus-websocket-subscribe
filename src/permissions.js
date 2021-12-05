/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Veryt basic permissions implementation
 */

export async function getPermissions(accountability, { database }) {

	let permissions = [];

	if (accountability.admin !== true) {
		const permissionsForRole = await database
			.select('*')
			.from('directus_permissions')
			.where({ role: accountability.role });

		permissions = permissionsForRole.map((permissionRaw) => {
			const permission = JSON.parse(JSON.stringify(permissionRaw));

			if (permission.permissions && typeof permission.permissions === 'string') {
				permission.permissions = JSON.parse(permission.permissions);
			} else if (permission.permissions === null) {
				permission.permissions = {};
			}

			if (permission.validation && typeof permission.validation === 'string') {
				permission.validation = JSON.parse(permission.validation);
			} else if (permission.validation === null) {
				permission.validation = {};
			}

			if (permission.presets && typeof permission.presets === 'string') {
				permission.presets = JSON.parse(permission.presets);
			} else if (permission.presets === null) {
				permission.presets = {};
			}

			if (permission.fields && typeof permission.fields === 'string') {
				permission.fields = permission.fields.split(',');
			} else if (permission.fields === null) {
				permission.fields = [];
			}

			return permission;
		});
	}

	return permissions;
}