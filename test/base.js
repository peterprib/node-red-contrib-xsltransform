'use strict';
const assert=require('assert');
const { platform } = require('node:process');
const SaxonEngine=require('../xsltransform/saxonEngine')
const saxonEngine=new SaxonEngine();
const path=require('path');
const saxon = require('saxon-js')
const { exec } = require('node:child_process');
const { access, constants, readdirSync, readFile, readFileSync, writeFileSync } = require('node:fs');
const cwd= "tmp" //cwd=current working directory

if(platform!=="win32") {
	describe("Spawn Enviroment", function() {
		it("pwd", function(done) {
			spawnCommand("pwd",{},
				(error, stdout, stderr) => {
					console.log({label:"spawn",error:error,stdout:stdout,stderr:stderr})
				}
			)
		});
		it("pwd +cwd", function(done) {
			spawnCommand("pwd",{cwd:"tmp"},
				(error, stdout, stderr) => {
					console.log({label:"spawn",error:error,stdout:stdout,stderr:stderr})
				}
			)
		});
		it("find xslt3", function(done) {
			spawnCommand('find / -name "xslt3"',{},
				(error, stdout, stderr) => {
					console.log({label:"spawn",error:error,stdout:stdout,stderr:stderr})
				}
			)
		});
		it("find npx", function(done) {
			spawnCommand('find / -name "npx"',{},
				(error, stdout, stderr) => {
					console.log({label:"spawn",error:error,stdout:stdout,stderr:stderr})
				}
			)
		});
		it("env", function(done) {
			spawnCommand('env',{},
				(error, stdout, stderr) => {
					console.log({label:"spawn",error:error,stdout:stdout,stderr:stderr})
				}
			)
		});
	});
}
function transform(xml,sef,params) {
	const resultStringXML = saxon.transform({
	  stylesheetText: sef,
	  sourceText: xml,
	  destination: "serialized",
	  stylesheetParams:params
	});
	return resultStringXML.principalResult
}

function test(xml,xsl){
	const label=xml+"-"+xsl;
	it(label, function(done) {
		const file=path.join("test",xml+".xml")
		const xmlString=readFileSync(file, 'utf8');
		saxonEngine.transform(xmlString,xsl,
			{},
			(result)=>{
				const resultFile="./test/results/"+label;path.join("test","results",label)
				let expectedResult;
				try{
					expectedResult=readFileSync(resultFile,'utf8');
				} catch(ex) {
					console.log("*** creating new result file "+label)
					writeFileSync(resultFile,r)
					return;
				}
				assert.equal(result.replace(/\r\n/gm, "\n"),expectedResult.replace(/\r\n/gm, "\n"));
				done()
			},
			done
		)
	});
}

describe("saxon", function() {
	it("compile ", function(done) {
		saxonEngine.getSEF("formatxml",(sef)=>done(sef?null:"missing SEF output"),done)
	});
	it("removeCache ", function(done) {
		saxonEngine.removeCache("formatxml",done,done)
	});
	it("clearCache ", function(done) {
//		saxonEngine.setDebug()
		saxonEngine.clearCache(done,done)
//		saxonEngine.setDebug()

	});
	it("compile inline", function(done) {
		readFile(path.join('xsl','formatxml.xsl'), (ex, data) => {
			if (ex) {
				console.error("readFile "+ex.message)
				done(ex)
			} else {
				console.log("readFile ok")
				const SEFFile=path.join(cwd,'testInline.xslt')
				saxonEngine.xslToSEFforce("testInline",data,
					()=>{
						console.log("readFile xslToSEFforce")
						access(SEFFile, constants.F_OK,
							(ex)=>{
								console.log("access "+(ex?ex.message:"ok"))
								done(ex?ex.message:null)
						})
					},
					done
				)
			}
		})
	});
	it("compile inline fail" , function(done) {
		saxonEngine.xslToSEFforce("testInlineRubbish","rublish xsl",
			()=>done("sholud have failed"),
			(err)=>{
				console.log({label:"fail xsl",error:err})
				done()
			},
		)
	})
})


describe("xsltransform", function() {
	readdirSync('./xsl').forEach(function(file) {
		it("get SEF "+file, function(done) {
			try{
				saxonEngine.getSEF(path.parse(file).name,()=>done(),done)
			} catch(ex){
				console.log("*** failed "+ex.message)
				done(ex)
			}
		}).timeout(10000);
	});
	test("values","formatxml");
	test("values","removerEmptyNodes");
	test("values","removerEmptyOrNewLineTextNodes");
	test("values","xml2jsonBasic");
	test("values","XSLTJSON");
	test("values","xml2html");
//	test("values","xml2json");
	test("valuesJSON","json2xml");
});
