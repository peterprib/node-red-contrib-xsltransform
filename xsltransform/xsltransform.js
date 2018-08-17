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
var xsltProcess = require('xslt-processor').xsltProcess;
var xmlParse = require('xslt-processor').xmlParse;
//import {xsltProcess, xmlParse} from "xslt-processor"

module.exports = function (RED) {
//    var RED = require(process.env.NODE_RED_HOME+"/red/red");    

    function xslTransform(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
	    var xslParseCache = this.context().global.get('xslParseCache');
	    if (!xslParseCache) {
	       this.error("no parse cache");
   	        this.status({fill:"red",shape:"ring",text:"xsl cache empty"});
            node.error("xsl cache not defined specified");
        }
    	if(config.xsl==null) {
            node.error("no xsl specified");
        }
        var node = this, cnt=0, errCnt=0;
        node.on("input", function(msg) {
            try {
                var xslId=msg.xsl||msg.topic;
                msg.payload = xsltProcess(xmlParse(msg.payload) , xslParseCache[xslId]);
                node.send([msg,null]);
            } catch(err) {
//	        node.send([null,{ _msgid: msg._msgid, payload: result }]);
                node.error(err.message,msg);
       	       this.error("processing "+xslId+" error: "+err);
               errCnt++;
            }
            this.status({fill:"green",shape:"ring",text:"processed "+(++cnt) + " errors: "+errCnt});
        });
    }
    RED.nodes.registerType("xslTransform", xslTransform);
 
    function xslParse(config) {
	var xslParseCache = this.context().global.get('xslParseCache');
	if (!xslParseCache) {
	       this.log("Establish xslparse cache");
           xslParseCache={};
           this.context().global.set('xslParseCache',xslParseCache);
        }

        RED.nodes.createNode(this, config);
        this.name = config.name;
        var node = this, loadCnt=0, errCnt=0;
        node.on("input", function(msg) {
            try {
    	        xslParseCache[msg.topic]=xmlParse(msg.payload);
       	        this.log("loaded "+msg.topic);
       	        loadCnt++;
            } catch(err) {
       	        this.error("loaded "+msg.topic+ " Error: "+err);
                node.error(err.message,msg);
                errCnt++;
            }
            this.status({fill:"green",shape:"ring",text:"loaded: "+loadCnt+" errors: "+errCnt});
        });                
    }
    RED.nodes.registerType("xslParse", xslParse);
};
