const { get } = require("https");

/*eslint-disable no-use-before-define */
const logger=new (require("node-red-contrib-logger"))("xslTransform");
logger.sendInfo("Copyright 2022 Jaroslav Peter Prib");

const fs=require('fs'),
	path=require('path'),
	saxon=require('saxon-js'),
	saxonPlatform=saxon.getPlatform(),
	xslDirectory=__dirname + '/../xsl';
let xslParseCache={};
function sef(xsl){
	const doc=saxonPlatform.parseXmlFromString(xsl);
	doc._saxonBaseUri="file:///";
	return saxon.compile(doc);
}
function transform(xml,xsl,params) {
	const resultStringXML=saxon.transform({
	  stylesheetInternal: xsl,
	  sourceText: xml,
	  destination: "serialized",
	  stylesheetParams:params
	});
	return resultStringXML.principalResult
}
function buildCacheCommon(node){
	xslParseCache=node.context().global.get('xslParseCache');
	if(xslParseCache) return;
	xslParseCache={};
}
function loadCache(node){
	if(logger.active) logger.send({label:"loadCache"});
	node.log("Load xslparse cache");
	node.context().global.set('xslParseCache',xslParseCache);
	fs.readdirSync(xslDirectory).forEach(function(file) {
		getSEF(node,file.replace('.xsl', ''),true)
	});
}
function getSEF(node,name,replace){
	if(logger.active) logger.send({label:"getSEF",name:name});
	if(xslParseCache.hasOwnProperty(name)){
		return xslParseCache[name];
	}
	node.log("loading: "+name);
	const xsl=fs.readFileSync(path.join(xslDirectory, name+".xsl"), "utf8");
	try{
		xslParseCache[name]=sef(xsl);
	} catch(ex){
		node.error("loaded "+name+ " Error: "+err);
		node.status({fill:"red",shape:"ring",text:"failed to compile xsl"});
	}
	return xslParseCache[name]
}

module.exports=function (RED) {
    function xslParse(config) {
        const node=this;
		let loadCnt=0, errCnt=0;
        RED.nodes.createNode(node, config);
		Object.assign(node,config);
		buildCacheCommon(node);
        loadCnt=Object.keys(xslParseCache).length;
        node.status({fill:"green",shape:"ring",text:"initially loaded: "+loadCnt});
        node.on("input", function(msg) {
			try{
				stylesheet=sef(msg.payload);
			} catch(ex) {
				node.error("loaded "+msg.topic+ " Error: "+err);
				node.error(err.message,msg);
				errCnt++;
				node.status({fill:"yellow",shape:"ring",text:"loaded: "+loadCnt+" errors: "+errCnt});
				return
			} 
			if(stylesheet===null) {
				if(xslParseCache.hasOwnProperty(msg.topic)) {
					delete 	xslParseCache[msg.topic];
					loadCnt--;
				}
			} else {
				xslParseCache[msg.topic]=stylesheet;
				node.log("loaded "+msg.topic);
				loadCnt++;
				node.log("xslParseCache "+Object.keys(xslParseCache));
			}
			node.context().global.set('xslParseCache',xslParseCache);
			node.status({fill:"green",shape:"ring",text:"loaded: "+loadCnt+" errors: "+errCnt});
        });                
    }
    RED.nodes.registerType("xslParse", xslParse);

    function xslTransform(config) {
        var node=this, cnt=0, errCnt=0;
        RED.nodes.createNode(node, config);
		Object.assign(node,config);
        node.status({fill:"green",shape:"ring",text:"processed "+(++cnt) + " errors: "+errCnt});
        if(node.xsl && node.xsl.startsWith("<")) {
			try{
				node.stylesheet=sef(node.xsl) 
				node.log("loaded inline xml");
				if(logger.active) logger.send({label:"config xsl loaded"});
			} catch(ex){
   	        	node.error("load inline xml error: "+err);
              	node.status({fill:"red",shape:"ring",text:"FAILED check log"});
			}
        } else {
			try{
				buildCacheCommon(node);
				if(node.xsl) node.stylesheet=getSEF(node,node.xsl)
				else loadCache(node);
				node.status({fill:"green",shape:"ring",text:"ready"});
			} catch(ex){
				logger.sendErrorAndStackDump("failed build",ex)
	            node.status({fill:"red",shape:"ring",text:"failed build "});
				return
			}
		}

        node.on("input", function(msg) {
			if(logger.active) logger.send({label:"input",msg:msg});
        	const param=msg.param||node.param;
        	let xslName,stylesheet=node.stylesheet||null;
			try {
				if(stylesheet==null) {
					if(logger.active) logger.send({label:"input get stylesheet"});
					xslName=node.xsl||msg.xsl||msg.topic
					stylesheet=getSEF(node,xslName);
					if(!stylesheet) return;
				}
				if(param) param=JSON.parse(param)
				msg.payload=transform(msg.payload,stylesheet,param)	
				node.status({fill:"green",shape:"ring",text:"processed "+(++cnt) + " errors: "+errCnt});
				node.send(msg);
				if(logger.active) logger.send({label:"input sent",msg:msg});
			} catch(ex) {
				if(logger.active) logger.sendErrorAndStackDump("input error",ex);
	            node.status({fill:"yellow",shape:"ring",text:"processed "+(++cnt) + " errors: "+(++errCnt)});
            	node.error("processing "+(node.stylesheet?"inline":xslName)+" error: "+ex.message,msg);
           	}
        });
    }
    RED.nodes.registerType(logger.label, xslTransform);
}