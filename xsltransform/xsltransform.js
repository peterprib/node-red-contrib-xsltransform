/*
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
/*eslint-disable no-use-before-define */
//var xsltProcess = require('xslt-processor').xsltProcess;
//var xmlParse = require('xslt-processor').xmlParse;
//import {xsltProcess, xmlParse} from "xslt-processor"

var libxslt = require('libxslt'),
//	libxmljs = libxslt.libxmljs,
	fs=require('fs'),
	path=require('path'),
	xslParseCache;

module.exports = function (RED) {
    function xslParse(config) {
        var node = this, loadCnt=0, errCnt=0;
        RED.nodes.createNode(node, config);
        node.name = config.name;
		xslParseCache = node.context().global.get('xslParseCache');
		if (!xslParseCache) {
	       node.log("Establish xslparse cache");
           xslParseCache={};
           node.context().global.set('xslParseCache',xslParseCache);
           var directory=__dirname + '/../xsl';
//			var pattern=new RegExp("^j.*\.xsl$","i")
           fs.readdirSync(directory).forEach(function(file) {
//				if(!pattern.test(file) return;
				node.log("loading: "+file);
				var name = file.replace('.xsl', '');
				libxslt.parse(fs.readFileSync(path.join(directory, file), "utf8"), function(err, stylesheet){
					if(err) {
		   	        	node.error("loaded "+name+ " Error: "+err);
    	            	errCnt++;
					} else {
    	        		xslParseCache[name]=stylesheet;
	       	       		loadCnt++;
			          	node.status({fill:"green",shape:"ring",text:"initially loaded: "+loadCnt+" errors: "+errCnt});
					}

				});
       		});
          	node.status({fill:"green",shape:"ring",text:"initially loaded: "+loadCnt+" errors: "+errCnt});
        } else {
        	loadCnt=Object.keys(xslParseCache).length;
          	node.status({fill:"green",shape:"ring",text:"initially loaded: "+loadCnt+" errors: "+errCnt});
        }
        node.on("input", function(msg) {
			libxslt.parse(msg.payload, function(err, stylesheet){
				if(err) {
		   	        node.error("loaded "+msg.topic+ " Error: "+err);
	                node.error(err.message,msg);
    	            errCnt++;
				} else {
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
				}
	           	node.context().global.set('xslParseCache',xslParseCache);
                node.status({fill:"green",shape:"ring",text:"loaded: "+loadCnt+" errors: "+errCnt});
			});
        });                
    }
    RED.nodes.registerType("xslParse", xslParse);

    function xslTransform(config) {
        var node = this, cnt=0, errCnt=0;
        RED.nodes.createNode(node, config);
        node.name = config.name;
        node.status({fill:"green",shape:"ring",text:"processed "+(++cnt) + " errors: "+errCnt});

        if(config.xsl && config.xsl.startsWith("<")) {
			libxslt.parse(config.xsl, function(err, stylesheet){
				if(err) {
   	        		node.error("load inline xml error: "+err);
              		node.status({fill:"red",shape:"ring",text:"FAILED check log"});
				} else {
   	        		node.stylesheet=stylesheet;
					node.log("loaded inline xml");
  	        	}
			});
        } else {
   		    xslParseCache = node.context().global.get('xslParseCache');
		    if (!xslParseCache) {
		    	node.error("no parse cache");
   	    	    node.status({fill:"red",shape:"ring",text:"xsl cache empty"});
        	}
        }
      
        node.on("input", function(msg) {
        	var param=msg.param||config.param
        		,stylesheet=node.stylesheet||null;
			if(stylesheet===null) {
				var prop =config.xsl||msg.xsl||msg.topic;
				try {
					if(!xslParseCache.hasOwnProperty(prop)) throw Error("not in cache");
	            	stylesheet=xslParseCache[prop];
				} catch(e) {
	            	node.status({fill:"yellow",shape:"ring",text:"processed "+(++cnt) + " errors: "+(++errCnt)});
            		node.error("processing "+prop+" error: "+e,msg);
            		return;
            	}
			}
			try {
				if(param) param=JSON.parse(param)
    	    	stylesheet.apply(msg.payload, param, function(err, result){
	    			if(err) {
			            node.status({fill:"yellow",shape:"ring",text:"processed "+(++cnt)+ " errors: "+(++errCnt)});
    					node.error("processing error: "+err);
               			errCnt++;
    				} else {
	    				msg.payload = result;
		            	node.status({fill:"green",shape:"ring",text:"processed "+(++cnt) + " errors: "+errCnt});
						node.send(msg);
    				}
 	 			});  
			} catch(e) {
	            	node.status({fill:"yellow",shape:"ring",text:"processed "+(++cnt) + " errors: "+(++errCnt)});
            		node.error("processing "+(prop||"inline")+" error: "+e,msg);
            		return;
           	}
        });
    }
    RED.nodes.registerType("xslTransform", xslTransform);

};
