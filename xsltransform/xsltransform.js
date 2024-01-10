const logger=new (require("node-red-contrib-logger"))("xslTransform");
logger.sendInfo("Copyright 2022 Jaroslav Peter Prib");
const { setEngine } = require("crypto");
const SaxonEngine=require('../xsltransform/saxonEngine')
const { error } = require("console");
const saxonEngine=new SaxonEngine();
//saxonEngine.setDebug()
const statusOK=function(){this.status({fill:"green",shape:"ring",text:"ready"})};
const statusError=function(message){
	this.log(message)
	logger.sendErrorAndStackDump("failed build",Error(message))
	this.status({fill:"red",shape:"ring",text:"failed build "+message});
}

const statusxslParseError=function(message){
	this.log(message)
	errCnt++
	this.status({fill:"yellow",shape:"ring",text:"loaded: "+loadCnt+" errors: "+errCnt});
}
module.exports=function (RED) {
    function xslParse(config) {
        const node=this
		let loadCnt=0, errCnt=0
        RED.nodes.createNode(node, config)
		Object.assign(node,config)
        node.status({fill:"green",shape:"ring",text:"initially loaded: "+loadCnt})
        node.on("input", function(msg) {
			try{
				if(msg.topic==="@removeCache") {
					SaxonEngine.removeCache(msg.topic,
						()=>{
							node.log("removed "+msg.payload);
							loadCnt--;
							node.status({fill:"green",shape:"ring",text:"loaded: "+loadCnt+" errors: "+errCnt});
						},
						statusxslParseError.bind(node)
					)
				} else saxonEngine.xsltToSEFForce(msg.topic,msg.payload,
						()=>{
							loadCnt++;
							node.log("loaded "+msg.topic);
							node.status({fill:"green",shape:"ring",text:"loaded: "+loadCnt+" errors: "+errCnt});
						},
						statusxslParseError.bind(node)
					)
			} catch (ex) {
				node.error("loaded " + msg.topic + " Error: " + ex.message)
				node.error(ex.message,msg)
				errCnt++
				node.status({fill:"yellow",shape:"ring",text:"loaded: "+loadCnt+" errors: "+errCnt});
			} 
        });                
    }
    RED.nodes.registerType("xslParse", xslParse);

    function xslTransform(config) {
        const node=this;
        RED.nodes.createNode(node, config);
		Object.assign(node,config,{errorCount:0});
        node.status({fill:"yellow",shape:"ring",text:"preparing"});
		try{
			if(node.xslFile) {
				if(logger.active) logger.send({label:"xslFile",stylesheet:node.xslFile});
				node.stylesheet = saxonEngine.xsltFileNameToStylesheet(node.xslFile)
				saxonEngine.getSEF(node.stylesheet,statusOK.bind(node),
					()=>{
						if(logger.active) logger.send({label:"xslFile getSEF",stylesheet:node.stylesheet});
						saxonEngine.xsltFileToSEF(node.xslFile,statusOK.bind(node),statusError.bind(node))
					}
				)
			} else if(node.xsl && node.xsl.startsWith("<")) {
				if(logger.active) logger.send({label:"xsl inline",styleshet:node.id,});
				node.stylesheet=node.id
				saxonEngine.xsltToSEFForce(node.stylesheet,node.xsl,statusOK.bind(node),statusError.bind(node))
        	} else {
				if(logger.active) logger.send({label:"xsl deferred prep",stylesheet:node.xsl,});
				node.status({fill:"yellow",shape:"ring",text:"Deferred prepare"});
				node.deferredPrepare=true
				node.stylesheet=node.xsl
			}
		} catch(ex){
			logger.sendErrorAndStackDump("failed build",ex)
       	    node.status({fill:"red",shape:"ring",text:"failed build "+ex.message});
			return;
		}
        node.on("input", function(msg) {
			if(logger.active) logger.send({label:"input",topic:msg.topic});
        	let param=msg.param||node.param;
        	let xslName,stylesheet;
			try {
				if(param) param=JSON.parse(param);
				if(node.stylesheet) stylesheet=node.stylesheet
				else if(msg.xsl && msg.xsl.startsWith("<")) {
					xslName=node.id
					saxonEngine.xsltToSEFForce(xslName,msg.xsl,
						()=>{
							msg.payload=saxonEngine.transform(msg.payload,xslName,param,
								(data)=>{
									node.send(msg);
									if(logger.active) logger.send({label:"input sent"});
								},
								(errorMsg)=>{
									if(logger.active) logger.sendErrorAndStackDump("input error transform "+ errorMsg);
									node.status({fill:"yellow",shape:"ring",text:"errors: "+(++node.errorCount)});
									node.error("processing inline xsl error: "+errorMsg,msg);
								}
							);
						},
						(errorMsg)=>{
							if(logger.active) logger.sendErrorAndStackDump("input error xsltToSEFForce"+errorMsg);
							node.status({fill:"yellow",shape:"ring",text:"errors: "+(++node.errorCount)});
							node.error("processing inline xsl error: "+errorMsg,msg);
						}
					)
				} else stylesheet = msg.xsl??msg.topic
				if(stylesheet!==null) {
					if(logger.active) logger.send({label:"input stylesheet: "+stylesheet});
					saxonEngine.transform(msg.payload,stylesheet,param,
						(data)=>{
							if(node.deferredPrepare){
								statusOK.call(node)
								delete node.deferredPrepare
							}
							msg.payload=data
							node.send(msg);
							if(logger.active) logger.send({label:"input sent"});
						},
						(errorMsg)=>{
							if(logger.active) logger.sendErrorAndStackDump("input error transform inline "+errorMsg);
							node.status({fill:"red",shape:"ring",text:"errors: "+(++node.errorCount)});
							node.error("processing "+node.stylesheet+" error: "+errorMsg,msg);
						}
					);
				}
			} catch(ex) {
				if(logger.active) logger.sendErrorAndStackDump("input error",ex);
	            node.status({fill:"yellow",shape:"ring",text:"errors: "+(++node.errorCount)});
            	node.error("processing "+(node.stylesheet?"inline":xslName)+" error: "+ex.message,msg);
           	}
        });
    }
    RED.nodes.registerType(logger.label, xslTransform);
}