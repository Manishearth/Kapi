(function() {

	window.drawMode="pen";
	window.penDown=false;
	var canvas = document.querySelector('#paint');
	var ctx = canvas.getContext('2d');
    var curr;
	var sketch = document.querySelector('#sketch');
	var sketch_style = getComputedStyle(sketch);
	canvas.width = parseInt(sketch_style.getPropertyValue('width'));
	canvas.height = parseInt(sketch_style.getPropertyValue('height'));

	var mouse = {x: 0, y: 0};
	 
	/* Mouse Capturing Work */
	
	
	/* Drawing on Paint App */
	ctx.lineWidth = document.getElementById('thickness').value;
	document.getElementById('thickness').onchange=function(){	ctx.lineWidth = document.getElementById('thickness').value;}
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.strokeStyle = document.getElementById('coloor').value;
	document.getElementById('coloor').onchange=function(){ctx.strokeStyle=document.getElementById('coloor').value;}
	document.getElementById('erase').onclick=function(){canvas.width = parseInt(sketch_style.getPropertyValue('width'));
	canvas.height = parseInt(sketch_style.getPropertyValue('height'));}
    document.getElementById('pen').onclick=function(){ window.drawMode="pen"}; 
	
	
	canvas.addEventListener('mousemove', function(e) {
	
		if(window.penDown && window.drawMode=="pen"){
		mouse.x = e.pageX - this.offsetLeft;
		mouse.y = e.pageY - this.offsetTop;
			ctx.lineTo(mouse.x, mouse.y);
			ctx.stroke();
			
		}
	}, false);
	function updatePen(e){
	if(window.drawMode!="pen"){
				
			var d = document.getElementById('point');
           // d.style.position = "absolute";
           d.style.left = e.pageX+"px";
           d.style.top = e.pageY+"px";
		
	}
	}
	canvas.addEventListener('mousedown', function(e) {
		window.penDown=true;
		updatePen(e);
				mouse.x = e.pageX - this.offsetLeft;
			mouse.y = e.pageY - this.offsetTop;

			
		if(window.drawMode=="pen"){	
				
//				ctx.moveTo(mouse.x, mouse.y);
				ctx.beginPath();
		}
		if(window.drawMode=="line"){	
				
				ctx.beginPath();
				ctx.moveTo(mouse.x, mouse.y);
				
		}
		if(window.drawMode=="rect"){
			window.rectX=mouse.x
			window.rectY=mouse.y
		}
		if(window.drawMode=="circ"){
			window.rectX=mouse.x
			window.rectY=mouse.y
		}
	}, false);
	 
	canvas.addEventListener('mouseup', function(e) {
	if(!window.penDown){
	console.log("huh?");
	return true;
	}
			window.penDown=false;
			mouse.x = e.pageX - this.offsetLeft;
			mouse.y = e.pageY - this.offsetTop;
			if(window.drawMode=="pen"){
			
			}
			if(window.drawMode=="line"){

	
			ctx.lineTo(mouse.x, mouse.y);
			ctx.stroke();
			}
			if(window.drawMode=="rect"){
			ctx.strokeRect(window.rectX, window.rectY, mouse.x-window.rectX,mouse.y-window.rectY);
			}
			
			if(window.drawMode=="circ"){
			ctx.beginPath()
			ctx.arc((window.rectX+mouse.x)/2, (mouse.y+window.rectY)/2, 0.5*Math.sqrt((mouse.x-window.rectX)*(mouse.x-window.rectX) + (mouse.y-window.rectY)*(mouse.y-window.rectY)),0,Math.PI*2,false);
			ctx.stroke();
			}
	}, false);
	 

	

    //onclicks
	document.getElementById('line').onclick=function()
	{ 
        window.drawMode="line";
	 }
	document.getElementById('rectangle').onclick=function(){window.penDown=false;window.drawMode="rect"}
	document.getElementById('circle').onclick=function(){window.penDown=false;window.drawMode="circ"}
	document.getElementById('getimage').onclick=function(){
		var oCanvas = document.getElementById('paint');
		var strDataURI = oCanvas.toDataURL(); 
		//Canvas2Image.saveAsPNG(oCanvas);
		var oImgPNG = Canvas2Image.saveAsPNG(oCanvas, true);
		console.log(oImgPNG);
		document.getElementById('yo').appendChild(oImgPNG);
	}
	 document.getElementById('downloadimage').onclick=function(){
		 var oCanvas = document.getElementById('paint');
		var strDataURI = oCanvas.toDataURL(); 
		Canvas2Image.saveAsPNG(oCanvas);
	 }
	
	
}());
