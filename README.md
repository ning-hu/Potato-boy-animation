# Potato-boy-animation

Potato boy fights monster 
(loosely based on the Japanese anime: Made in Abyss)

Potato boy (Reg) is travelling in the Abyss. He’s in the layer called 
Goblet of Giants, a place where there are tall mushrooms filled with water.

Reg is a durable robot with humanlike features and personality. He extends 
his arm to grab onto the neighboring mushroom, but much to his surprise, a 
monster called the Orbed Piercer (OP) is already there. Angry that it’s 
territory has been invaded, OP quickly charges forward and shoots out spikes. 
Quick to react, Reg dodges the attack by jumping into the air. From there, he 
launches his counterattack by grabbing onto OP in midair and pulling himself 
towards it. Further enraged, OP tries to shake Reg off by first shaking its 
body back and forth and then rearing up on its hind legs. Luckily for it, 
rearing up caused Reg to fall off. However, Reg was prepared for that and 
started prepping his strongest attack - a laser that is shot from his palm. 
Quickly reacting, OP turns around and sidesteps the laser, fleeing from its 
territory. 

The custom shapes I created were Hemisphere and Mushroom. The Circle class I 
declared is actually just Surface_of_Revolution from surfaces.js. Hemisphere
is exactly what it sounds like. I needed half of a sphere for Reg’s feet and 
helmet. It takes Grid_Sphere, and does not complete the full 3.14 rotation
upon creation. Mushroom was used to make the “goblets” or platforms will with 
water that my characters are standing on. I modified the Rounded_Closed_Cone 
class to include more vertices so that it would have a smooth stem with a 
large “mushroom” portion. 

I used the look_at function to track Reg as he fights with OP until he wins
and shoots his laser. I felt that for the end, it was more aesthetic to view 
the scene from behind Reg. 

Most of the textures were custom-created by me in Photoshop Elements 8.0. 

I wanted a dark-green/blue foggy background, so my entire scene takes place
inside a sphere.

I added several intermediate positions to make Reg’s transition from 
the air to OP’s back more smooth (he turns in midair). This can also be seen 
in other segments. I added several intermediate motions for when Reg is
jumping onto the Central Arena mushroom, and I tried to mimic how a person
would look while performing those actions. 

When Reg is on the back of OP, it may look awkward that he is rotating in the 
opposite direction. I felt that it would be more realistic if it seemed like 
OP was moving side to side so hard that Reg was swinging and losing his grip. 

This was made for my CS174A class at UCLA.
This project utilizes WebGL with a Javascript wrapper.
The only file I editted was index.html. 
