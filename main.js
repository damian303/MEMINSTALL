var done=[];
var doing={"CT":"","id":"","location":""};
var device;
var cts_used=[];
var sensors;
var temp;
var client_ID;
var store_ID;
var imps_pre_install =[];

	$( document ).bind( "mobileinit", function() {
	// Make your jQuery Mobile framework configuration changes here! 
	$.mobile.allowCrossDomainPages = false;// THis doesnt help delete it ?
	});
	
	$('#login').live('pageinit', function(event, ui) {
         // FILL IN FORM IF DATA EXISTS
		if(localStorage.getItem("username")==='undefined'){
			var username = "username";
			var password = "password";
			$("#txt_username").val(username);
			$("#txt_pwd").val(password);
		}
		else{
			var username = localStorage.getItem("username");
			var password = localStorage.getItem("password");
			$("#txt_username").val(username);
			$("#txt_pwd").val(password);
		};
		$('#btn_login').click(function(){verifyLogin();});
    });

	$("div[data-role=page]").bind("pagebeforeshow", function (e, data) {
		$.mobile.silentScroll(0);
	});
	
	$("#client_ID").change(function() {
		getData($("#client_ID").val());
	});
	
	$("#saveDevice").button({ disabled: false }); //////////// To try to fix dodgy save button
	
	$(document).delegate("#layout", "pageshow", function() {
        if(device!==""){
			var checkDevice = $.trim($("#select-device").find('option:selected').text()).replace(' ', '+');
			alert("Device : "+device+" selected. menu says : "+checkDevice+".");
			$("#select-device").val(device);
			$("#select-device").selectmenu("refresh");
		}
    });
	
	$('#setStore').click(function(){
		client_ID= $("#client_ID").val();
		store_ID= $("#store_ID").val();
		var file_name = $("#client_ID").val()+"-"+$("#store_ID").val()+".svg";
		
		//// This kills the dropdowns for client and store and leaves a label /// /// WE NEED A RESET BUTTON IN CASE THE WRONG STORE IS SET 
		//$('#chooseStore').html("Client ID :"+$("#client_ID").val()+"<br/>Store ID :"+$("#store_ID").val())////
		$('#client_info').html("Client ID :"+$("#client_ID").val()+"<br/>Store ID :"+$("#store_ID").val());
		$.mobile.changePage( '#layout', { transition: "slideup", changeHash: false });	
		d3.xml("http://microenergymonitor.com/app/layouts/"+file_name, "image/svg+xml", function(xml) {
		
			d3.select("#svg").style("height", "500px");//////////////// Hard coded change in final version
			$('#svg').html(xml.documentElement);
			
			d3.selectAll(".freezer")
				.style("stroke-width", 2)
				.style("fill", "#BFBFD4")
				.on("click", function(){
					if($("#select-device").find('option:selected').text()!=""){
						//// SET DEVICE NAME ////
						device = $.trim($("#select-device").find('option:selected').text()).replace(' ', '+');
						var id = $(this).attr("id");
						temp = id;
						///////// Change the page to CT chooser ///////////////////////
						$.mobile.changePage( '#CT_chooser', { transition: "slideup", changeHash: false });	
						//// Set the freezer location ///
						doing["location"]=temp.replace("f","");/////////// Get Rid of the "f" at the begining of location number
						d3.select(this).style("fill", "red");
						
						$('#freezerID').html("Freezer No: "+id+"");
						for(var i = 1;i<4;i++){
							$("#sensor-"+i).attr('disabled',false).attr('checked', false).checkboxradio('refresh',true);
						}
						for(var i = 0;i<done.length;i++){
							$("#sensor-"+done[i]).attr('disabled',true).attr('checked', false).checkboxradio('refresh',true);
						}
					}
					else{
						alert("Please select a device!");
					}
				});
		});
		getAvailableImps();
		getSensors();
});

init_buttons(); ///// Attempting to fix loopback problem Just init butons once //

function init_buttons(){
			
			$('#scan')	
				.click( function(){
					// Scan sensor
					scanIt();//// Open Scanner Dialog ///
				});
				
			$('#reScan')
				.click( function(){
					/* OPEN THE SCANNER PAGE*/
					$.mobile.changePage( '#scan_sensor', { transition: "slideup", changeHash: false });		
				});
				
			$('#saveSensor')
				.click( function(){
					// Save it all 
					saveData();/*************** Send sensor id, location to server ***************/
				});
				
			$('#finished')
				.click( function(){
					// Save the imp and remove from preinstalled 
					saveDevice();/*************** Send imp info to server ***************/
					/* OPEN THE SET LAYOUT*/
					$.mobile.changePage( '#layout', { transition: "slideup", changeHash: false });
					getSensors();					
				});
				
			$('#not_finished')
				.click( function(){
					/* OPEN THE SET LAYOUT*/
					$.mobile.changePage( '#layout', { transition: "slideup", changeHash: false });	
					getSensors();
				});
}

$('#setCT').click(function(){
		///// Set the CT ////
		var CT = $("#sensorPosition :radio:checked").val().replace("choice-", "");
		doing.CT=CT;
		
		d3.select("#"+temp).style("fill", "green")
		
		var coords = {x:+d3.select("#"+temp).attr("x"),y:+d3.select("#"+temp).attr("y")};
		var dims = {width:+d3.select("#"+temp).attr("width"),height:+d3.select("#"+temp).attr("height")};
	
		d3.select("#floor_plan")//// Label the selected freezer
			.append("text")
			.attr("class", "label")
			.attr("dx", coords.x+(dims.width/2)-3)///// SHimmy
			.attr("dy", coords.y+(dims.height/2)+5)
			.text(CT);
		/* init buttons went here */
		
		/* OPEN THE SCANNER PAGE*/
		$.mobile.changePage( '#scan_sensor', { transition: "slideup", changeHash: false });				
});

function scanIt(){

	$('#barcode').html("preparing to scan");
	var scanner = cordova.require("cordova/plugin/BarcodeScanner");

        scanner.scan( function (result) { 
			result.text = convertHEX(result.text);// Convert to new id format
            $('#sensor_id').html(result.text);
          
			doing.id=(result.text).replace(/(\r\n|\n|\r)/gm,"");;
        }, function (error) { 
            alert("Scanning failed: ", error); 
        } );
		
	function convertHEX(num){// This function removes leading zeros in each 2 char section //
		var newString = "";
		for(var i = 0; i<(num.length); i+=2){
			var char1 = num.charAt(i);
			var char2 = num.charAt(i+1);
			if(char1=='0')newString += (char2);
			else newString += (char1+char2);
		}
		return newString;
	}
	if(sensors[doing.id]){//// THis sensor has already being scanned ///
		///////// Change the page to scan_used  ///////////////////////
		$.mobile.changePage( '#sensor_used', { transition: "slideup", changeHash: false });	
	}
	else{//// All is well ! ////
		///////// Change the page to scan_done  ///////////////////////
		$.mobile.changePage( '#scan_done', { transition: "slideup", changeHash: false });	
	}
}
function saveData(){
	$('#lastID').html("Saving Sensor"+doing.id+"to database..");

      $.ajax({
            type : 'POST',          
            url : 'http://microenergymonitor.com/app/saveSensor.php', // savesensors.php saves the data to the sensors table         
            data:{
                'client_ID':client_ID,
                'store_ID':store_ID,
				'device': device,
				'imp_ID': imps_pre_install[device],
				'data':doing
            },
			dataType:"text",
            success : function(response) {  
                if(response!=="FAIL"){
					reset();/********** RESET 'doing' object *********/
					/* OPEN THE All Done PAGE*/
					$.mobile.changePage( '#all_done', { transition: "slideup", changeHash: false });
                } else {                   
                   alert("Save Failed!");
                }
            },
            error : function(xhr, type) {
              alert('Error : '+xhr+' '+type);
            }
      });   
}
function saveDevice(){/////////////////// This sends the device ID to saveDevice.php which moves the device ID into the imp table from the pre_install table
	
    done=[]; ///// This resets the working list of CTs ///
	  $.ajax({
            type : 'POST',          
            url : 'http://microenergymonitor.com/app/saveDevice.php', // saveDEvice.php saves the device name to the imps table.         
            data:{
                'client_ID':client_ID,
                'store_ID':store_ID,
				'device': device,
				'imp_ID': imps_pre_install[device],
            },
			dataType:"text",
            success : function(response) {  
                if(response!=="FAIL"){
					reset();/********** RESET 'doing' object *********/
					//$('#chooser').popup('close');///// Close the chooser window ////
                } else {                   
                   alert('Save failed!');
                }
            },
            error : function(xhr, type) {
                 alert('Error : '+xhr+' '+type);
            }
      });   
}
function verifyLogin(){     
    var uname=$('#txt_username').val();
    var pwd=$('#txt_pwd').val();
      $.ajax({
            type : 'POST',          
            url : 'http://microenergymonitor.com/app/checkLoginInstaller.php', // php script URL          
            data:{
                'username':uname,
                'password':pwd
            },
			dataType:"text",
            success : function(data) {  
                if(data!=="FAIL"){
					window.localStorage.setItem("username", data.username);
					window.localStorage.setItem("password", data.password);
					window.location.href = ('#set_client');
					//$.mobile.changePage( '#set_client', { transition: "slideup", changeHash: false });
					console.log("changing page");
					$('#set_client').live('pageshow', function(event, ui) {
						console.log("page changed");
						getData("client_ID");
					});

                } else {    
					// clear the stored password in case that is the problem //
					//localStorage.removeItem("password");
					window.localStorage.setItem("username", "");
					window.localStorage.setItem("password", "");
					$("#txt_pwd").val("");
                    alert("Wrong username or password");
                }
            },
            error : function(xhr, type) {
				// clear the stored password in case that is the problem //
				window.localStorage.setItem("username", "");
				window.localStorage.setItem("password", "");
				if(xhr.status==0){var err = "No Connection!";}
				else{var err = xhr.status;}
                alert('Error occurred : '+err+' '+type);
            }
      });   
}

function getData(type){	
	$.ajax({// THis bit gets the actual Data
					type : 'POST',          
					url : 'http://microenergymonitor.com/app/setupData.php', // php script URL          
					data:{'type':type},
					dataType   : 'text',
					success : function(response) {      
						if(response!=="FAIL"){   
							data=$.parseJSON(response);
							var html = "";
							if(type=="client_ID"){
								for(key in data){
									html+=  "<option value="+data[key]["client_ID"]+">"+data[key]["client_ID"]+"</option>";
								}
								$("#client_ID").html(html);
								$("#client_ID").selectmenu('refresh'); ////////////////////////// PROBLEM ?
								getData($("#client_ID").val());
							}
							else
							{
								for(key in data){	
									html+=  "<option value="+data[key]["store_ID"]+">"+data[key]["store_ID"]+"</option>";
								}
								$("#store_ID").html(html);
								////// Clear the value ////////
								$("#store_ID").selectmenu('refresh');////////////////////////// PROBLEM ?
							}	
						} else {                   
							alert("Data retrieval fail!");
						}
					},
					error : function(xhr, type) {
						alert('server error occurred :'+type);
					}
		}); 
}
function getAvailableImps(){     
	
      $.ajax({
            type : 'POST',          
            url : 'http://microenergymonitor.com/app/getAvailableImps.php', // php script URL          
            data:{
                'client_ID':client_ID,
                'store_ID':store_ID
            },
			dataType:"text",
            success : function(response) {  
				data=$.parseJSON(response);
				
                if(data!=="FAIL"){
					//// Updata dropdown ///
					var html="";
					
					for(key in data){
									html+=  "<option value="+data[key]["imp_name"]+">"+data[key]["imp_name"]+"</option>";
									imps_pre_install[data[key]["imp_name"]] = data[key]["imp_ID"];
								}
								$("#select-device").html(html);
								$("#select-device").selectmenu('refresh');
                } else {                   
                    alert("No available imps!");
                }
            },
            error : function(xhr, type) {
                alert('server error occurred '+xhr.status+' '+type);
            }
      });   	  
}
function getSensors(){     
	
      $.ajax({
            type : 'POST',          
            url : 'http://microenergymonitor.com/app/getSensors.php', // php script URL          
            data:{
                'client_ID':client_ID,
                'store_ID':store_ID
            },
			dataType:"text",
            success : function(response) {  
				console.log(response);
                if(data!=="FAIL"){
					sensors=$.parseJSON(response);
					for(id in sensors){
					
						var temp_ID = "#f"+sensors[id].location;
						d3.select(temp_ID).style("fill", "green");
						var coords = {x:+d3.select(temp_ID).attr("x"),y:+d3.select(temp_ID).attr("y")};
						var dims = {width:+d3.select(temp_ID).attr("width"),height:+d3.select(temp_ID).attr("height")};
					
						d3.select("#floor_plan")//// Label the selected freezer
							.append("text")
							.attr("class", "label")
							.attr("dx", coords.x+(dims.width/2)-3)///// SHimmy
							.attr("dy", coords.y+(dims.height/2)+5)
							.text(sensors[id].ct_position);
					}				
                } else {                   
                    alert("No sensors!");
                }
            },
            error : function(xhr, type) {
                alert('server error occurred '+xhr.status+' '+type);
            }
      });   	  
}

function reset(){
	done.push(doing.CT);//// Push the last CT into the done list //
	temp="";
	doing={"CT":"","id":"","location":""};
	//////// Here we need to refresh the device dropdown.//////  
	$('#lastID').html("Saved");
	getAvailableImps();
}
