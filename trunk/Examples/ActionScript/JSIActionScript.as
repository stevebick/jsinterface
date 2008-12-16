package {
	import aw.external.JSInterface;
	import aw.external.jsinterface.objects.JSDocument;
	
	import flash.display.Sprite;
	import flash.system.System;
	import flash.utils.setTimeout;

	public class JSIActionScript extends Sprite{
		public function JSIActionScript():void{
			super();
			JSInterface.initialize(this);
			setTimeout(this.addFunctions, 5000);
		}
		private function getFunc():Function{
			return function(){return true;};
		}
		protected function addFunctions():void{
			var d:JSDocument = JSInterface.document;
			for(var i:int=0; i<1000; i++){
				d.func = getFunc();
			}
			trace('addFunctions');
			setTimeout(this.clearFunctions, 5000);
		}
		protected function clearFunctions():void{
			JSInterface.clear(true);
			trace('clearFunctions');
			setTimeout(this.clearMemory, 5000);
		}
		protected function clearMemory():void{
			System.gc();
			trace('clearMemory');
		}
	}
}