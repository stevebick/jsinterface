### ActionScript'ing inside HTML page: ###
```
<script type="text/javascript">
	function onJSIInstalled(){
		try{
			var w = 100;
			var h = 20;
			var m = FLObject.create('flash.geom.Matrix');
			m.call('createGradientBox', [w, h, Math.PI/2]);
			var root = FLObject.root();
			var btn = FLObject.create('flash.display.SimpleButton');
			btn.set('x', 100);
			btn.set('y', 100);
			btn.set('upState', createState(w, h, 0xaaaaaa, 0x666666, m));
			btn.set('hitTestState', btn.get('upState'));
			btn.set('overState', createState(w, h, 0xeeeeee, 0x888888, m));
			btn.set('downState', createState(w, h, 0xeeeeee, 0x666666, m));
			btn.call('addEventListener', ['click', this.btnClickHandler]);
			root.call('addChild', [btn]);
		}catch(e){
			alert([e.message, e.description, e]);
		}
	};
	function createState(w, h, c1, c2, m){
		var sprite = FLObject.create('flash.display.Sprite');
		var g = sprite.get('graphics');
		g.call('beginGradientFill', [
			'linear', 
			new FLSimple([c1, c2]), 
			new FLSimple([1, 1]), 
			new FLSimple([0, 255]), 
			m
		]);
		g.call('drawRoundRect', [0, 0, w, h, 8]);
		g.call('endFill');
		var txt = FLObject.create('flash.text.TextField');
		txt.set('width', w);
		txt.set('height', h);
		txt.set('htmlText', '<p align="center"><font face="Verdana" size="10">Click button!</font></p>');
		sprite.call('addChild', [txt]);
		return sprite;
	}
	function btnClickHandler(e){
		setTimeout(traceEvent, 1, ['CLICK!']);
	}
	function traceEvent(){
		alert('CLICK!');
	}
</script>
```

### Use internal JavaScript framework(now in development): ###
```
<script type="text/javascript" src="flash_objects.js"></script>
<script type="text/javascript">
	flash('flash.geom.Matrix');
	flash('flash.text.TextField');
	flash('flash.display.Sprite');
	flash('flash.display.SimpleButton');
	flash('flash.display.GradientType');
	flash('flash.display.Graphics');
	function onJSIInstalled(){
		try{
			var w = 100;
			var h = 20;
			var m = new Matrix();
			m.createGradientBox(w, h, Math.PI/2);
			var root = new Sprite(FLObject.root());
			var btn = new SimpleButton();
			btn.x(100);
			btn.y(100);
			btn.upState(createState(w, h, 0xaaaaaa, 0x666666, m));
			btn.hitTestState(btn.upState());
			btn.overState(createState(w, h, 0xeeeeee, 0x888888, m));
			btn.downState(createState(w, h, 0xeeeeee, 0x666666, m));
			btn.addEventListener('click', this.btnClickHandler);
			root.addChild(btn);
		}catch(e){
			alert(e.message);
		}
	};
	function createState(w, h, c1, c2, m){
		var sprite = new Sprite();
		var g = sprite.graphics();
		g.beginGradientFill(GradientType.LINEAR, [c1, c2], [1, 1], [0, 255], m);
		g.drawRoundRect(0, 0, w, h, 8);
		g.endFill();
		var txt = new TextField();
		txt.width(w);
		txt.height(h);
		txt.htmlText('<p align="center"><font face="Verdana" size="10">Click button!</font></p>');
		sprite.addChild(txt);
		return sprite;
	}
	function btnClickHandler(e){
		setTimeout(traceEvent, 1, ['CLICK!']);
	}
	function traceEvent(){
		alert('CLICK!');
	}
</script>
```

You can download this code from examples package or with sources.