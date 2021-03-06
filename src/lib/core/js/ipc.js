/*
 * Copyright (c) 2010-2014 BinarySEC SAS
 * Core engine [http://www.binarysec.com]
 * 
 * This file is part of Gate.js.
 * 
 * Gate.js is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var cluster = require("cluster");
var events = require('events');
var eventEmitter = new events.EventEmitter();

var ipc = function(gjs) { /* loader below */ };

ipc.spawnMaster = function(gjs) {
	
	var net = require("net");
	var fs = require("fs");
	var readline = require('readline');
	var util = require("util");

	var socketFile = gjs.serverConfig.runDir+'/ipc';
	var users = {};
	
	gjs.mkdirDeep(socketFile);
	
	/* remove socketFile */
	try {
		fs.unlinkSync(socketFile);
	} catch(e) { /* do nothing */ }

	/*
	 * Bind ipc server
	 */
	var service = net.Server();
	ipc.userCast = {};
	
	/* bind Events */
	for(var a in eventEmitter)
		ipc[a] = eventEmitter[a];
	
	ipc.send = function(type, cmd, msg) {
		ipc.broadcast(JSON.stringify({
			from: 'root',
			type: type,
			cmd: cmd,
			msg: msg
		}), false);
	}
	
	ipc.broadcast = function(msg, exclude) {
		for(var a in ipc.userCast) {
			if(exclude != false && a != exclude)
				ipc.userCast[a].write(msg+"\r\n");
			else if(exclude == false)
				ipc.userCast[a].write(msg+"\r\n");
		}
	}
	
	process.on('SIGUSR2', function() {
		ipc.emit("SIGUSR2", gjs);
		ipc.send('LFW', "SIGUSR2", false);
	});

	service.on('connection', function(client) {
		ipc.userCast[client._handle.fd] = client;
		client.fd = client._handle.fd;

		client.readline = readline.createInterface({
			terminal: false,
			input: client
		});
		
		client.readline.on('line', function(data) {
			var jdata = JSON.parse(data);
			
			/* far forward */
			if(jdata.type == 'FFW') {
				/* remote forward */
				gjs.lib.core.npc.send(jdata);
				
				/* local forward */
				ipc.broadcast(data, client.fd);
			}
			/* local forward */
			else if(jdata.type == 'LFW') {
				/* local forward */
				ipc.broadcast(data, client.fd);
			}

			/* emit myself the event */
			if(jdata.cmd)
				ipc.emit(jdata.cmd, gjs, jdata);
		});
		
		client.on('end', function() {
			delete ipc.userCast[client.fd];
		});
		
	});

	service.on('error', function(e) {
		console.log('* IPC: error on '+socketFile+' '+e);
	});
	
	service.on('listen', function() {
		console.log("IPC system running on "+socketFile);
	});
	
	service.listen(socketFile);
}

ipc.spawnSlave = function(gjs) {
	if(!gjs.serverConfig.runDir)
		return;
	
	var net = require("net");
	var readline = require('readline');

	/* bind Events */
	for(var a in eventEmitter)
		ipc[a] = eventEmitter[a];
	
	var socketFile = gjs.serverConfig.runDir+'/ipc';
	
	gjs.mkdirDeep(socketFile);

	var client = net.connect(socketFile);
	
	client.on('connect', function() {
		client.readline = readline.createInterface({
			terminal: false,
			input: client
		});
		
		client.readline.on('line', function(data) {
			var jdata = JSON.parse(data);
		
			/* emit myself the event */
			if(jdata.cmd)
				ipc.emit(jdata.cmd, gjs, jdata);
		});
	});

	// type :
	// FFW = far forward
	// LFW = local forward
	// RFW = root forward
	ipc.send = function(type, cmd, msg) {
		client.write(JSON.stringify({
			from: cluster.worker.process.pid,
			type: type,
			cmd: cmd,
			msg: msg
		})+'\n');
	}
	
	
// 	/* in order to graceful restart we need to close IPC connection to exit */
// 	function gracefulReceiver() {
// 		client.destroy();
// 		gjs.lib.gjsCore.ipc.removeListener('system:graceful:process', gracefulReceiver);
// 	}
// 	
// 	/* add graceful receiver */
// 	ipc.on('system:graceful:process', gracefulReceiver);
	
}

ipc.loader = function(gjs) {
	if(cluster.isMaster)
		ipc.spawnMaster(gjs);
	else
		ipc.spawnSlave(gjs);
	
}


module.exports = ipc;


