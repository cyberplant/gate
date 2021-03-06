
var serverConfig = function(bs) { return({
// 	serverProcess: 4,
	hostname: "testServer0",
	
	runDir: "/tmp/gatejs",
	dataDir: "/home/bwsfg",
	logDir: "/var/log/gatejs",
	confDir: '/home/mykii/Documents/share',
	
	plugins: [
		'/home/mykii/Documents/share/plugin1'
	],
	
	http: {
		forwardInterface: {
			type: 'forward',
			port: 8080,
			pipeline: 'pipetest'
		},
		reverseInterface: {
			type: 'reverse',
		}
	},
	
	pipeline: {
		pipetest: [
			/* set & hide request headers */
			['headers', { 
				set: { 
					"X-Header-One": 'Alasklikeuflux',
				},
// 				hide: [
// 					'X-FRAME-options'
// 				]
			} ],
			['cache', { }],
			['acn', { }],
			['proxyPass', { mode: 'host', timeout: 10 }]
		],
	},
	
	acn: {
		mode: 'multicast',
		listen: '0.0.0.0',
		port: 9043,
		address: "224.0.0.174",
		deadInterval: 2000,
		pingInterval: 200,
		deadRequest: 50
	}

	
})};

module.exports = serverConfig;


