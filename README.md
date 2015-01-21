cssTransition
===================


**Caution**
Currently the project is unstable!


> **Example:  #1**

```
transit('div').createFrame({translatex: '20px'}, {duration: 0.5).play(function(){
	// callback
	alert('callback');
});
```

> **Example:  #2**

```
transit('div')
.createFrame({translatex: '20px'}, {duration: 0.5)
.createFrame({rotatey: '60deg'}, '1s 100ms easeInCric')
.play(function(){
	this.loop(5, function(){
		this.rewind();
	});
});
```
