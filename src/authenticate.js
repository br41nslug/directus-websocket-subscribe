/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Handles basic static token verification
 */

function getQuery(request) {
    const q = request.url.replace(/^.*\?/, '');
    // very basic query parsing
    return q.split('&').reduce((query, str) => {
        const kv = str.split('=');
        query[kv[0]] = kv[1] || true;
        return query;
    }, {});
}

function getAuthHeader(request) {
    const header = request.headers['authorization'];
    if ( ! header) return;
    return header.replace('Bearer ', '');
}

export async function authenticate(request, { database }, nextHandler) {
    const ip = request.socket.remoteAddress;
    const query = getQuery(request);
    const token = query.api_token || getAuthHeader(request);
	request.accountability = {
		user: null,
		role: null,
		admin: false,
		app: false,
		ip: ip.startsWith('::ffff:') ? ip.substring(7) : ip,
		userAgent: request.headers['user-agent'],
	};

	if (token) {
        // Try finding the user with the provided token
        const user = await database
            .select('directus_users.id', 'directus_users.role', 'directus_roles.admin_access', 'directus_roles.app_access')
            .from('directus_users')
            .leftJoin('directus_roles', 'directus_users.role', 'directus_roles.id')
            .where({
                'directus_users.token': token,
                'status': 'active',
            })
            .first();

        if ( ! user) {
            return nextHandler();
        }

        request.accountability.user = user.id;
        request.accountability.role = user.role;
        request.accountability.admin = user.admin_access === true || user.admin_access == 1;
        request.accountability.app = user.app_access === true || user.app_access == 1;
	}

	return nextHandler();
}