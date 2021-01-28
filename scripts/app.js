let canvas;
let wrapper;
let ctx;
var pz;
var pz2;
let brushXPoints = new Array();
let brushYPoints = new Array();
let brushDownPos = new Array();
var rules = new Array();

let dragging = false;
var rule_created = null;
let currentTool = '';
let usingBrush = false;
let n_drawings = 0;

let strokeColor = 'black';
let fillColor = 'black';
let line_Width = 1;
var button_size = 50;

var room_code = GetCookie("room_code");
var player_name = GetCookie("player_name");
var player_color = GetCookie("player_color");
var current_turn = "";
var my_turn_step="";

var sampleApp = angular.module('sampleApp', []);
events();

sampleApp.config(['$routeProvider',
	function($routeProvider) {
		$routeProvider.
			when('/', {
				templateUrl: 'views/login.html',
				controller: 'loginController'
			}).
			when('/waitroom', {
				templateUrl: 'views/waitroom.html',
				controller: 'waitroomController'
			}).
			when('/game', {
				templateUrl: 'views/game.html',
				controller: 'gameController'
			}).
			when('/players_menu', {
				templateUrl: 'views/players_menu.html',
				controller: 'playermenuController'
			}).
			otherwise({
				redirectTo: '/'
			});
}]);

sampleApp.controller('loginController', function($scope) {
	document.getElementById("new_game").addEventListener("click", function() {new_game();},false);
	document.getElementById("join_game").addEventListener("click", function() {join_game_1();},false);
	if (player_name){
		document.getElementById("name").value = player_name;
	}
});
sampleApp.controller('waitroomController', function($scope) {
	document.getElementById("title").innerHTML  = "Room code: " + room_code;
	document.getElementById("everybody_in").addEventListener("click", function() {everybody_in();},false);
	refresh_players();
});
sampleApp.controller('gameController', function($scope) {
	setupCanvas()
});
sampleApp.controller('playermenuController', function($scope) {
	document.getElementById("players_menu_title").innerHTML  = "Room code: " + room_code;
	populate_players();
});

function populate_players(){send_request("&action=" + "get_players",populate_players_2);}
function populate_players_2(response){
	players = JSON.parse(response);
	var dropdown = document.querySelectorAll('.dropdown-trigger');
	var instances = M.Dropdown.init(dropdown, {'direction':'bottom'});
	var dropdown_eles = document.getElementsByClassName('dropdown-content')[0];
	dropdown_eles.innerHTML = "";
	for (var i=0;i<players.length;i++){
		add = '<li><a class="dropdown_element" onclick="kick_player_out(' +"'"+ players[i]["name"] +"'"+ ')">' + players[i]["name"] + '</a></li>'
		dropdown_eles.innerHTML = dropdown_eles.innerHTML.concat(add);
		console.log(dropdown_eles.innerHTML)
	}
}

function kick_player_out(pass){
	Swal.fire({
		title: 'Are you sure you want to kick ' + pass + ' out?',
		text: "",
		icon: 'warning',
		showCancelButton: true,
		confirmButtonColor: '#3085d6',
		cancelButtonColor: '#d33',
		cancelButtonText: 'Nah nevermind',
		confirmButtonText: "Yes, kick'em the **** out!"
	}).then((result) => {
	if (result.value) {
		send_request("&action=" + "kick_player_out" + "&who=" + pass);
		Swal.fire(
	 	'Done!',
	  	''+pass+'is not longer with us',
	 	 'success'
		)
	}
	})
	
}

function quit_game(){
	window.location.href = "/";
	send_request("&action=" + "kick_player_out" + "&who=" + player_name);
}

function valid_login(){
	if (document.getElementById("name").value == ""){
		error_popup("Enter a name");
		return false;
	}
	if (document.getElementById("name").value.length > 10){
		error_popup("Please enter a name with less than 10 characters");
		return false;
	}
	return true;
}

function new_game(){
	if (valid_login()){send_request("&action=" + "new_game",new_game_response);}
}
function new_game_response(response){
	if (response.length==4){
		room_code = response;
		player_name = document.getElementById("name").value;
		send_request("&action=" + "join_game", join_game_response);
	}
}

function join_game_1(){
	if (valid_login()){popup_input('Enter the room code!', join_game_2);}
}
function join_game_2(room){
	room_code = room;
	player_name = document.getElementById("name").value;
	send_request("&action=" + "join_game", join_game_response);
}
function join_game_response(response){
	response = JSON.parse(response);
	room_code = response["room_code"];
	player_name = response["player_name"];
	player_color = response["player_color"];
	document.cookie = "room_code=" + room_code;
	document.cookie = "player_name=" + player_name;
	document.cookie = "player_color="+response["player_color"];

	evtSource.close();
	events();

	if (response["action"]=="to_waitroom"){window.location.href = "#/waitroom";}
	if (response["action"]=="to_game"){window.location.href = "#/game";}
}

function refresh_players(){send_request("&action=" + "refresh_players",refresh_players_response);}
function refresh_players_response(response){
	if (response.includes("to_game")){
		window.location.href = "#/game";
		return;
	}
	var players = JSON.parse(response);
	var elements = document.getElementsByClassName("sign_small");
	for (i=0;i<players.length;i++){
		elements[i].innerHTML = players[i]["name"];
	}
	if (players[0]["name"]!=GetCookie("player_name")){
		document.getElementById("everybody_in").className  = "disabled_submit_button";
	}
}

function everybody_in(){send_request("&action=" + "everybody_in", everybody_in_response)}
function everybody_in_response(response){window.location.href = "#"; window.location.href = "#/game";}

function setupCanvas(){
	canvas = document.getElementById('my-canvas');
	wrapper = document.getElementById('wrapper');
	canvas.width = wrapper.clientWidth;
	canvas.height = wrapper.clientHeight;
	ctx = canvas.getContext('2d');
	ctx.strokeStyle = strokeColor;
	ctx.lineWidth = line_Width;

	M.FloatingActionButton.init(document.querySelectorAll('.fixed-action-btn'), {'direction':'bottom', 'hoverEnabled':false});
	var elems = document.querySelectorAll('.btn-floating');
	elems[1].addEventListener("click", function() {quit_game();}, false);
	elems[2].addEventListener("click", function() {window.location.href = "#/players_menu";}, false);
	elems[3].addEventListener("click", function() {full_screen()}, false);

	canvas.addEventListener("touchstart", handleStart, false);
	canvas.addEventListener("touchmove", handleMove, false);
	canvas.addEventListener("touchend", handleUp, false);
	canvas.addEventListener("mousedown", handleStart, false);
	canvas.addEventListener("mousemove", handleMove, false);
	canvas.addEventListener("mouseup", handleUp, false);

	document.getElementById ("brush").addEventListener ("click", function() {button_pressed('brush');}, false);
	document.getElementById ("pinch").addEventListener ("click", function() {button_pressed('pinch');}, false);
	document.getElementById ("coin").addEventListener ("click", function() {button_pressed('coin');}, false);
	document.getElementById ("undo").addEventListener ("click", function() {button_pressed('undo');}, false);
	document.getElementById ("confirm").addEventListener ("click", function() {button_pressed('ok');}, false);

	brushXPoints = [];
	brushYPoints = [];
	brushDownPos = [];
	rules = [];

	button_manager("none")
	pz = new PinchZoom.default(wrapper, {
	draggableUnzoomed: true,
	minZoom: 1,
	horizontalPadding: 500,
	verticalPadding:500,

	onZoomEnd: function(object, event){
		// Do something on zoom end
		console.log("zooon end");
		pz.zoomFafffctor = .9;
	}
	})

	refresh_rules();
	setTimeout(function() { refresh_turn(); }, 2000);
}

function full_screen(){
	if (!document.fullscreenElement &&!document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {document.body.requestFullscreen();}
	else{document.exitFullscreen();}
}

var button_manager_status = "";
function button_manager(buttons){
	active_buttons = [];
	if (buttons.includes("refresh")){
		buttons = button_manager_status;
	}
	document.getElementById("coin").className = "disabled_menu_button";
	document.getElementById("brush").className = "disabled_menu_button";
	document.getElementById("pinch").className = "disabled_menu_button";
	document.getElementById("undo").className = "disabled_menu_button";
	document.getElementById("confirm").className = "disabled_menu_button";
	document.getElementById("coin_cont").style.zIndex="0";
	document.getElementById("brush_cont").style.zIndex="0";
	document.getElementById("pinch_cont").style.zIndex = "0";
	document.getElementById("undo_cont").style.zIndex="0";
	document.getElementById("confirm_cont").style.zIndex="0";
	
	if (currentTool == "brush"){
		document.getElementById("brush_img").src="icons_spin/brush.gif";
		document.getElementById("pinch_img").src="icons_spin/pinch.png";
	}
	else{
		document.getElementById("pinch_img").src="icons_spin/pinch.gif";
		document.getElementById("brush_img").src="icons_spin/brush.png";
	}

	if (buttons.includes("undo")){
		document.getElementById("undo").className  = "menu_button";
		active_buttons.push(document.getElementById("undo_cont"));
	}
	if (buttons.includes("coin")){
		document.getElementById("coin").className  = "menu_button";
		active_buttons.push(document.getElementById("coin_cont"));
	}
	if (buttons.includes("pinch")){
		document.getElementById("pinch").className  = "menu_button";
		active_buttons.push(document.getElementById("pinch_cont"));
	}
	if (buttons.includes("brush")){
		document.getElementById("brush").className  = "menu_button";
		active_buttons.push(document.getElementById("brush_cont"));
	}
	if (buttons.includes("confirm")){
		document.getElementById("confirm").className = "menu_button";
		active_buttons.push(document.getElementById("confirm_cont"));
	}
	p1 = screen.width/2-(active_buttons.length*(button_size+20)/2)
	active_buttons.forEach(function (item, index) {
		p2 = p1 + index*(button_size+20)
		item.style.left = p2+"px"
		item.style.zIndex="2";
	});

	button_manager_status = buttons;
}

function button_pressed(toolClicked){
	console.log("but pres")
	if (toolClicked == "pinch"){
		pz.enable();
		currentTool = "";
		button_manager("refresh");
	}
	else if (toolClicked == "brush"){
		pz.disable();
		currentTool = "brush";
		button_manager("refresh");
	}
	else{currentTool = "";}

	if (toolClicked == "coin"){
		my_turn_step = "flipped_coin";
		flip_coin();
		button_manager("none");
	}
	if (toolClicked == "undo"){
		undo_last_drawing();
		currentTool = ""
		button_pressed("brush")
	}
	if (toolClicked == "ok"){
		if (rule_created==null){								//pressed ok bc they are done drawing
			send_points();
			enter_rule();
			my_turn_step = "enter_rule"
		}
		else{													//pressed ok bc they are done with rule
			button_manager("none");
			var label = {"value": "rule", "x": -pz2.offset.x, "y": -pz2.offset.y, "zoom": pz2.zoomFactor/pz2.initial_zoomFactor};
			document.getElementById("floating_div_id").remove();
			document.getElementsByClassName("pinch-zoom-container-2")[0].remove();
			//pz2.disable();
			pz2 = null;
			pz.enable();
			var final_size =20*(label['zoom']);
			final_size = parseInt(final_size);
			create_rule_div(label['x'],label['y'],final_size,rule_created,false);
			coin_p = get_coin_location();
			send_request("&action=" + "send_rule" + "&label_x=" + label['x'] + "&label_y=" + label['y'] + "&label_size=" + final_size + "&text=" + rule_created + "&coin_x=" + coin_p[0] + "&coin_y=" + coin_p[1] + "&color=" + player_color , null);
			rule_created = null;
			my_turn_step = ""
			Swal.fire({icon: 'success',title: 'Nice rule!',showConfirmButton: false,timer: 1500})
		}
	}
}

function undo_last_drawing(){
	if (n_drawings>0){
		brushXPoints.pop();
		i = brushXPoints.lastIndexOf(-1)+1;
		brushXPoints = brushXPoints.slice(0,i);
		brushYPoints = brushYPoints.slice(0,i);
		mousedown = brushYPoints.slice(0,i);
		refresh_view()
		n_drawings--;
	}
	if (n_drawings==0){my_turn_step="about_to_draw";button_manager("pinch_brush");}
	else{my_turn_step="drawing";button_manager("pinch_brush_undo")}
}

function convert_x_y_zoomed(x,y){
	y += pz.offset.y;
	x += pz.offset.x;
	wrapper_scale = wrapper.getBoundingClientRect().width / wrapper.offsetWidth;
	wrapper_screen_width = wrapper.clientWidth * wrapper_scale;
	wrapper_screen_height = wrapper.clientHeight * wrapper_scale;
	x = (x/wrapper_screen_width)*canvas.width;
	y = (y/(wrapper_screen_height))*canvas.height;
	return[parseInt(x),parseInt(y)];
}

function handleStart(evt) {
	evt.preventDefault();
	if (evt.changedTouches==null) {
		executeStart(evt.pageX,evt.pageY)
	}
	else{
		for (var i = 0; i < evt.changedTouches.length; i++) {
			executeStart(evt.changedTouches[i].pageX,evt.changedTouches[i].pageY);
		}
	}
};

var pixeldata;
function executeStart(x,y){
	dragging = true;
	if(currentTool === 'brush'){
		usingBrush = true;
		c = convert_x_y_zoomed(x, y);
		AddBrushPoint(c[0],c[1]);
	}
	pixeldata = getPixelData(ctx);
}

function handleMove(evt) {
	evt.preventDefault();
	if (evt.changedTouches==null) {
		executeMove(evt.pageX,evt.pageY)
	}
	else{
		for (var i = 0; i < evt.changedTouches.length; i++) {
			executeMove(evt.changedTouches[i].pageX,evt.changedTouches[i].pageY);
		}
	}
}

var edge_margin = 10;
function executeMove(x,y) {
	if (currentTool === 'brush' && dragging && usingBrush){
		c = convert_x_y_zoomed(x,y);
		color = getPixel(pixeldata,c[0],c[1])
		if (2<color && color<4000000000){//is not background or black
			handleUp();
			return;
		}
		if(c[0] > 0 && c[0] < canvas.width && c[1] > 0 && c[1] < canvas.height){// Throw away brush drawings that occur outside of the canvas
			if(-edge_margin < c[0] && c[0] < edge_margin){c[0]=0;}
			else if(canvas.width-edge_margin < c[0] && c[0] < canvas.width+edge_margin){c[0]=canvas.width;}
			if(-edge_margin < c[1] && c[1] < edge_margin){c[1]=0;}
			else if(canvas.height-edge_margin < c[1] && c[1] < canvas.height+edge_margin){c[1]=canvas.height;}
			AddBrushPoint(c[0], c[1], true);
		}
		DrawBrush();
	}
};

function handleUp(e){
	if (currentTool == 'brush'&&dragging&&usingBrush){
		n_drawings++;
		AddBrushPoint(-1, -1, false); //this eventually needs to go?
		if (flood=floodFill(ctx, get_coin_location(), player_color)){
			button_manager("confirm_undo")
			pz.enable();
			currentTool = ""
		}
		else{
			my_turn_step="drawing";
			button_manager("pinch_brush_undo")
		}
	}
	dragging = false;
	usingBrush = false;
}

function AddBrushPoint(x, y, mouseDown){
	brushXPoints.push(x);
	brushYPoints.push(y);
	brushDownPos.push(mouseDown);
}

function DrawBrush(){
	i_ = getAllIndexes(brushXPoints,-1);
	i_ = i_[i_.length-(n_drawings+1)];
	if (i_==null){i_=0}
	ctx.beginPath();
	ctx.moveTo(brushXPoints[i_], brushYPoints[i_]);
	for (i = i_; i < brushXPoints.length; i++) {
		if (brushXPoints[i]==-1 && brushYPoints[i]==-1){
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(brushXPoints[i+1], brushYPoints[i+1]);
		}
		else{
			ctx.lineTo(brushXPoints[i], brushYPoints[i]);
			ctx.stroke();
		}
	}
}

function confirm_drawing(){
	button_pressed("");
	button_manager("confirm_undo")
	my_turn_step = "confirm_drawing"
}

function send_points() {
	i = getAllIndexes(brushXPoints,-1)
	i = i[i.length-(n_drawings+1)]+1
	if (i==-1){i=0};
	new_x = JSON.stringify(brushXPoints.slice(i)); //cut to the last section (after the 0)
	new_y = JSON.stringify(brushYPoints.slice(i));
	send_request("&action=" + "send_points" + "&new_x=" + new_x + "&new_y=" + new_y,null)
}

function flip_coin(p1){
	var all_coins = document.getElementsByClassName("div_coin");
	for(var i = all_coins.length -1; i >= 0 ; i--){all_coins[i].remove();}
	var div = document.createElement("div");
	div.setAttribute("id",'div_coin');
	div.setAttribute("class",'div_coin');
	div.style.position = "absolute"		//do not change
	div.style.zIndex="10";
	var img = document.createElement("img");
	img.src = "icons_spin/coin3.gif";
	img.setAttribute("id",'img_coin');
	img.style.width=50+"px";
	img.style.height=50+"px";
	div.appendChild(img);
	wrapper.appendChild(div);

	if (p1 == null){
		var p1 = ran_screen()
		send_request("&action=" + "flip_coin" + "&ran_x=" + p1[0] + "&ran_y=" + p1[1],null)
	}
	animate_coin_to(p1, div, img);
}

function send_request(req, response_function){
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			console.log(this.responseText)
			if (this.responseText=="invalid_player" || this.responseText.includes("Error connecting to MySQL")){error_popup("Game not found!!","#/")}
			if (this.responseText.includes("Unknown database")){error_popup("We couldn't find the game you were looking for","#/")}
			if (response_function){response_function(this.responseText);}
		}
	};
	req = "scripts/server.php?room_code=" + room_code + "&player_name=" + player_name + req;
	console.log("Contacting server ", req);
	xmlhttp.open("GET", req, true);
	xmlhttp.send();
}

function refresh_turn(){	//returns true if the game should not refresh right now
	send_request("&action=" + "refresh_turn", refresh_turn_response);
}

function refresh_turn_response(response){	//returns true if the game should not refresh right now
	current_turn = response;
	document.getElementById("current_turn").innerHTML = "Room Code: "+ room_code + "\n" + response +"'s turn";
	if (response==player_name){//no need to refresh completely, just go back to the previous state
		if (my_turn_step=="flipped_coin"){return;}
		if (my_turn_step=="about_to_draw"){popup_draw();return;}
		if (my_turn_step=="drawing"){return;}
		if (my_turn_step=="confirm_drawing"){confirm_drawing();return;}
		if (my_turn_step=="enter_rule"){enter_rule();return;}
		if (my_turn_step=="dragging_rule"){return;}
		popup_your_turn();
	}
	else{
		my_turn_step=""
		button_manager("none");
		button_pressed("");
		refresh_rules();
	}
 }

function refresh_rules(){
	send_request("&action=" + "refresh_rules", refresh_rules_response);
 }
function refresh_rules_response(response){
	rules = JSON.parse(response);
	var all_divs = document.getElementsByClassName("div_rule");
	for(var i = all_divs.length -1; i >= 0 ; i--){
		all_divs[i].remove();
	}
	for (var i=0; i<rules.length; i++){
		var rule = rules[i];
		create_rule_div(rule['label_x'],rule['label_y'],rule['label_size'],rule['text'],false);
	}
	refresh_points();
}

function refresh_points(){
	send_request("&action=" + "refresh_points" + "&current_point_count=" + brushXPoints.length,refresh_points_response);
 }
function refresh_points_response(response){
	var server_points = JSON.parse(response);
	if (server_points.length == 0){refresh_view();return;}
	AddBrushPoint(parseInt(server_points[0]['x']), parseInt(server_points[0]['y']), false);
	for (var i=1; i<server_points.length; i++)
	{
		var this_x = parseInt(server_points[i]['x']);
		var this_y = parseInt(server_points[i]['y']);
		if (this_x!=-1 && this_y!=-1){
			AddBrushPoint(this_x, this_y, true);
		}
		else{
			AddBrushPoint(this_x, this_y, false);
			i+=1;
			if (i<server_points.length){
				this_x = parseInt(server_points[i]['x']);
				this_y = parseInt(server_points[i]['y']);
				AddBrushPoint(this_x, this_y, false);
			}
		}
	}
	refresh_view();
}

function refresh_view(p1, action){
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.beginPath();
	ctx.moveTo(brushXPoints[0]-1, brushYPoints[0]-1);
	ctx.lineTo(brushXPoints[0], brushYPoints[0]);	//solves a small issue witht the first point being too thin
	ctx.stroke();
	ctx.moveTo(brushXPoints[0], brushYPoints[0]);
	dropped_on_rule_id = null;
	for (i = 1; i < brushXPoints.length; i++) {
		if (brushXPoints[i]==-1 && brushYPoints[i]==-1){
			ctx.lineTo(brushXPoints[i-1]+2, brushYPoints[i-1]+2);
			ctx.stroke();
			ctx.moveTo(brushXPoints[i+1], brushYPoints[i+1]);
		}
		else{
			ctx.lineTo(brushXPoints[i], brushYPoints[i]);
			ctx.stroke();
		}
		for(var r = 0; r < rules.length; r++) {	//if there's a rule created at this point
			if (parseInt(rules[r]["added_at_point"])-1 == i) {
				if (p1!=null){color_before = getPixel(getPixelData(ctx),p1[0], p1[1]);}
				floodFill(ctx, [parseInt(rules[r]["coin_x"]), parseInt(rules[r]["coin_y"])], rules[r]["color"]);
				if (p1!=null){if(color_before != getPixel(getPixelData(ctx),p1[0], p1[1])){dropped_on_rule_id = rules[r]["id"];}
				}
			}
		}
	}
	if (action=="check_coin_drop"){
		if (player_name == current_turn){ //if its your turn
			if (dropped_on_rule_id==null){popup_draw();}  //landed in empty, and you're the player
			else{send_request("&action=" + "landed_on_rule" + "&rule_number=" + dropped_on_rule_id);}//landed on a rule
		}
	}
}

var evtSource;
function events(){
	console.log("Listening for server");
	console.log("scripts/server_events.php?room_code="+room_code+"&player_name="+player_name)
	evtSource = new EventSource("scripts/server_events.php?room_code="+room_code+"&player_name="+player_name);
	evtSource.onmessage = function(event) {
		console.log("Received server event: " + event.data);
		var data = JSON.parse(event.data);
		if (data["action"] == "everybody_in"){
			window.location.href = "#/game";
		}
		if (data["action"] == "new_player"){
			refresh_players();
		}
		if (data["action"] == "flip_coin"){
			if (current_turn!=player_name){flip_coin([parseInt(data['ran_x']),parseInt(data['ran_y'])]);}
			else{"but event ignored"}
		}
		if (data["action"] == "added_points"){
			refresh_rules();
		}
		if (data["action"] == "added_rule"){
			refresh_rules();
		}
		if (data["action"] == "next_turn"){
			var all_divs = document.getElementsByClassName("div_coin");
			for(var i = all_divs.length -1; i >= 0 ; i--){
				all_divs[i].remove();
			}
			refresh_turn();
		}
		if (data["action"] == "landed_on_rule"){
			popup_landed_on_rule(data["player_name"], data["rule"]);
		}
	};
	evtSource.onerror = function(err) {/*console.log(err)*/};
}

document.addEventListener("visibilitychange", function() {
	if (document.hidden){
		console.log("Browser tab is hidden")
		evtSource.close();
	} else {
		console.log("Browser tab is visible")
		if (window.location.href.includes("/game")){
			refresh_turn();
			refresh_points();
			if (my_turn_step == ""){refresh_rules();}
		}
		events();
	}
});

function GetCookie(a) {
	var b = document.cookie.match('(^|[^;]+)\\s*' + a + '\\s*=\\s*([^;]+)');
	var ret = b ? b.pop() : '';
	if (ret==""){
		return false;
	}
	return ret;
}

function create_rule_div(x,y,size,text, floating){
	var rule_div = document.createElement("div");
	wrapper.appendChild(rule_div);
	rule_div.setAttribute("class",'div_rule');
	rule_div.style.position = "absolute"
	rule_div.style.zIndex="9";
	rule_div.style.width=125+"px";
	rule_div.style.height=125+"px";
	rule_div.style.wordWrap="break-word";
	if (floating){
		rule_div.id = "floating_div_id";
		rule_div.style.left=0+"px";
		rule_div.style.top=0+"px";
	}
	else{
		rule_div.id = "div_id";
		rule_div.style.left=x+"px";
		rule_div.style.top=y+"px";
	}
	var para = document.createElement("p");
	rule_div.appendChild(para);
	para.innerHTML = text;
	para.style.position = "relative";
	para.style.fontSize = "20px";
	
	if (floating){//means it's the first time they clicked ok, so it will be floating to be positioned
		document.getElementById("wrapper").appendChild(rule_div);
		pz2 = new PinchZoom2.default(rule_div)
		var zoom = 125/canvas.width;
		pz2.zoomFactor = zoom;
		pz2.initial_zoomFactor = zoom;
		pz2.options.zoomOutFactor = zoom///10;
		pz2.options.tapZoomFactor = zoom;
		pz2.options.maxZoom = zoom//*2;
		pz2.options.minZoom = zoom///10;
		pz2.options._initialOffsetSetup = false;
		pz2.offset.x = -x;
		pz2.offset.y = -y;
		pz2.initialOffset.x = 0;
		pz2.initialOffset.y = 0;
		console.log(pz2)
	}
	return rule_div;
}

function animate_coin_to(end_point, div, img){
	if (current_turn == player_name){div.style.top = screen.height + 'px';}
	else{div.style.top = -300 + 'px';}

	div.style.left= Math.floor(Math.random()*screen.width/2) + 'px';
	frames_per_run = 200;
	frame = 1;
	n_runs = parseInt(Math.random()*5)+5;

	start_x = parseInt(window.getComputedStyle(div).left);
	start_y = parseInt(window.getComputedStyle(div).top);

	angle = Math.random()*Math.PI*2;
	angle_dir = Boolean(Math.round(Math.random()));
	point = ran_radius(end_point,n_runs*20);
	var id = setInterval(function(){go_to(point)}, 2);

	img.style.width=700 + "px";
	img.style.height=700 + "px";

	function go_to(point) {
		if (frame != frames_per_run) {
			if ((parseInt(img.style.width)>25)&&(frame%2==0)){
				img.style.width=parseInt(img.style.width)-7+"px";
				img.style.height=img.style.width;
			}
			div.style.top = start_y+(point[1]-start_y)/frames_per_run*frame + 'px';
			div.style.left = start_x+(point[0]-start_x)/frames_per_run*frame + 'px';
			frame++;
		}
		else {
			frame = 1;
			n_runs--;
			clearInterval(id);
			if (n_runs>1){
				point = ran_radius(end_point,n_runs*30)
				start_x = parseInt(window.getComputedStyle(div).left);
				start_y = parseInt(window.getComputedStyle(div).top);
				id = setInterval(function(){go_to(point)}, n_runs);
			}
			else if (n_runs==1){
				start_x = parseInt(window.getComputedStyle(div).left);
				start_y = parseInt(window.getComputedStyle(div).top);
				id = setInterval(function(){go_to(end_point)}, 10);
			}
			else{
				div.style.top = end_point[1] -12+ 'px';
				div.style.left = end_point[0] -12 + 'px';
				img.src = "icons_spin/coin.png";
				img.style.width=25+"px";
				img.style.height=25+"px";
				setTimeout(function(){refresh_view(end_point,"check_coin_drop")}, 1000);
			}
		}
	}
}

function get_coin_location(){
	return [parseInt(document.getElementById("div_coin").style.left)+12, parseInt(document.getElementById("div_coin").style.top)+12]
}

function ran_screen(){
	return [Math.floor(Math.random() * (wrapper.clientWidth-50))+25,Math.floor(Math.random() * (wrapper.clientHeight-50))+25];
}

var angle;
var angle_dir;
function ran_radius(end_point,r){
	angle = angle+(Math.random()*Math.PI/8)*angle_dir;
	ran_x = end_point[0]+Math.cos(angle)*r;
	ran_y = end_point[1]+Math.sin(angle)*r;
	if (ran_x>canvas.width || ran_x<0 || ran_y>canvas.height || ran_y<0){
		angle = Math.random()*Math.PI*2
		return ran_radius(end_point,r);
	}
	return [ran_x,ran_y];
}

function force_next_turn(){
	var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				console.log("Server response: ",this.responseText);
			}
		};
		xmlhttp.open("GET", "scripts/server.php?action=" + "next_turn" + "&room_code=" + room_code, true);
		xmlhttp.send();
		return;
}

function enter_rule(){
	popup_input('Enter your rule!', create_rule);
}

function create_rule(rule){
	rule_created = rule;
	popup_informative('Place the label in the circle and click confirm');
	pz.disable();
	my_turn_step = "dragging_rule"
	button_manager("confirm")
	cp = get_coin_location();
	create_rule_div(cp[0],cp[1],20,rule_created,true);
}

function popup_input(message, funct_end){
	Swal.fire({
		title: message,
		input: 'text',
		inputAttributes: {
			autocapitalize: 'on'
		},
		showCancelButton: false,
		confirmButtonText: 'Accept',
		showLoaderOnConfirm: true,
		preConfirm: (rule) => {},
		allowOutsideClick: false
		}).then((result) => {
			console.log("OK?",result)
			if (result.value==""){console.log("nosing");popup_input(message, funct_end)}
			else if (result.value.length>20){
				Swal.fire({
					icon: 'error',
					title: 'Oops...',
					text: 'You have exceeded 20 characters!!',
				}).then((result) => {
					popup_input(message, funct_end);
				});
			}
			else if (result.value) {
				funct_end(result.value);
			}
	})
}

function error_popup(message,routing){
	Swal.fire({
			icon: 'error',
		title: 'Oops...',
		text: message,
	}).then((result) => {
		if (routing){window.location.href = routing;}
	});
}

function popup_informative(message){
	Swal.fire({
		title: message,
		showClass: {popup: 'animate__animated animate__fadeInDown'},
		hideClass: {popup: 'animate__animated animate__fadeOutUp'}
	})
}

function popup_attention(message){
	Swal.fire(message)
}

function popup_your_turn(){
	if(popup_rule_visible){
		setTimeout(function(){popup_your_turn()},3000);
		return;
	}
	Swal.fire({
	  title: 'It\'s your turn!',
	  text: 'Congrats',
	  imageUrl: 'icons_spin/coin.gif',
	  imageWidth: 200,
	  imageHeight: 200,
	  imageAlt: 'Custom image',
	  //showConfirmButton: false,
	}).then((result) => {
		button_manager("coin");
	})
}

function popup_draw(){
	Swal.fire({
		title: 'Time to draw!',
		imageWidth: 200,
		imageHeight: 200,
		html: '<p>Press the brush and draw a circle around your coin</p><p>Remember to close the circle!</p>',
		imageUrl: 'icons_spin/brush.gif',
	}).then((result) => {
		n_drawings = 0;
		my_turn_step="about_to_draw";
		button_manager("pinch_brush");
	})
}

var popup_rule_visible = false;
function popup_landed_on_rule(player,rule){
	popup_rule_visible = true;
	Swal.fire({
		title: '<span style="color:#e6e6e6"><span> Uh oh!',
		imageWidth: 200,
		imageHeight: 200,
		background: "#333f52",
		html: '<span style="color:#e6e6e6"><span>' + "Looks like " + player + " just landed on\n" + rule,
		imageUrl: 'icons_spin/cheers.gif',
	}).then((result) => {
		popup_rule_visible = false;
	})
}

function getPixel(pixelData, x, y) {
  if (x < 0 || y < 0 || x >= pixelData.width || y >= pixelData.height) {
	return -1;  // impossible color
  } else {
	return pixelData.data[y * pixelData.width + x];
  }
}
function getImageData(ctx){return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);}
function getPixelData(ctx){
	imageData = getImageData(ctx);
	return pixelData = {
		width: imageData.width,
		height: imageData.height,
		data: new Uint32Array(imageData.data.buffer),
	};
}

function floodFill(ctx, p, fillColor) {
	fillColor = parseInt(fillColor, 16);
	x=p[0];y=p[1];
	const targetColor = getPixel(getPixelData(ctx), x, y);
	if (targetColor !== fillColor) {
		const pixelsToCheck = [x, y];
		while (pixelsToCheck.length > 0) {
			if(pixelsToCheck.length>250000){
				console.log("no fill")
				return false;
			}
			const y = pixelsToCheck.pop();
			const x = pixelsToCheck.pop();
			if (x==canvas.width || x==0){continue;}
			if (y==canvas.height || y==0){continue;}
			const currentColor = getPixel(pixelData, x, y);
			if (currentColor === targetColor) {
				pixelData.data[y * pixelData.width + x] = fillColor;
				pixelsToCheck.push(x + 1, y);
				pixelsToCheck.push(x - 1, y);
				pixelsToCheck.push(x, y + 1);
				pixelsToCheck.push(x, y - 1);
			}
		}
		console.log("should be colored")
		ctx.putImageData(imageData, 0, 0);
	}
	return true
}

function getAllIndexes(arr, val) {
	var indexes = [], i = -1;
	while ((i = arr.indexOf(val, i+1)) != -1){
		indexes.push(i);
	}
	return indexes;
}
