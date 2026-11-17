import type { Phase } from '../../domain/types';
import type { PhaseTips } from '../ro/phaseTips';

export { TIP_CATEGORIES } from '../ro/phaseTips';
export type { PhaseTips, Tip, TipCategory } from '../ro/phaseTips';

/**
 * Phase tips in English: a translation of `../ro/phaseTips.ts`, with the same ids.
 *
 * STATUS: editorial draft. Every text, including the “Why does it help?” explanations, must be reviewed
 * by a doctor before launch. The tone rules are the ones in `tips.ts`.
 */
export const phaseTips: Record<Phase, PhaseTips> = {
  menstruation: {
    summary:
      'Your body sheds the lining of the uterus, and hormone levels are low. Many people have less energy in the first days. It is fine to slow down.',
    hormones:
      'At the start of the cycle, oestrogen and progesterone are at their lowest. The drop in progesterone at the end of the last cycle triggers the shedding of the uterine lining. The uterus contracts with the help of substances called prostaglandins, which can also cause cramps. Towards the end of your period, oestrogen starts to rise again.',
    tips: {
      nutrition: [
        {
          id: 'men-nut-1',
          title: 'Iron-rich foods',
          body: 'Lentils, beans, spinach, eggs or red meat can help replace the iron lost through bleeding. Vitamin C from vegetables and fruit helps it absorb.',
          why: 'Bleeding also means losing iron. With hormones low, tiredness is felt more easily, and iron helps carry oxygen around the body.',
        },
        {
          id: 'men-nut-2',
          title: 'Fluids and warm meals',
          body: 'Water and warm teas can make bloating and cramps easier to handle. If you crave something sweet, a snack with protein keeps hunger away for longer.',
          why: 'The prostaglandins that make the uterus contract can also change the pace of digestion. Fluids and warm food are easier on a sensitive belly.',
        },
        {
          id: 'men-nut-3',
          title: 'Oily fish or nuts on the menu',
          body: 'Salmon, sardines, walnuts or flaxseed bring omega-3 fats. A portion a few times a week is a good guide.',
          why: 'Omega-3 fats help regulate inflammation. Some studies suggest they can make cramps, which are linked to prostaglandins, gentler.',
        },
        {
          id: 'men-nut-4',
          title: 'Snacks with magnesium',
          body: 'Pumpkin seeds, almonds, a banana or dark chocolate are snacks rich in magnesium.',
          why: 'Magnesium helps muscles relax, including the muscles of the uterus. For some people, that means milder cramps.',
        },
        {
          id: 'men-nut-5',
          title: 'A cup of ginger tea',
          body: 'Ginger or chamomile tea can be a warm, calming break on days with cramps.',
          why: 'Ginger seems to reduce the production of prostaglandins, and the warmth of the drink relaxes. The effect is modest, but some people feel it.',
        },
        {
          id: 'men-nut-6',
          title: 'Less salt in the first days',
          body: 'Very salty food can make bloating worse. Season with herbs, lemon or garlic.',
          why: 'The drop in hormones at the end of the cycle makes the body hold on to more water, and salt adds to this.',
        },
        {
          id: 'men-nut-7',
          title: 'Smaller, more frequent meals',
          body: 'If your appetite drops or you feel sick, small meals a few hours apart are easier to manage.',
          why: 'The prostaglandins of these days can cause nausea or take away your appetite. Small meals keep your energy steady without weighing on your stomach.',
        },
      ],
      movement: [
        {
          id: 'men-mov-1',
          title: 'Gentle movement',
          body: 'Walks, stretching or gentle yoga reduce discomfort for some people. If you feel like your usual workout, there is no general reason to avoid it.',
          why: 'Gentle movement increases circulation in the pelvis and releases endorphins, the body’s natural painkillers, which can counter cramps.',
        },
        {
          id: 'men-mov-2',
          title: 'Rest counts',
          body: 'On days with heavy flow or strong cramps, rest does as much as movement.',
          why: 'With oestrogen and progesterone at their lowest, many people have less energy in the first days. The body recovers faster if you let it rest.',
        },
        {
          id: 'men-mov-3',
          title: 'A 20-minute walk',
          body: 'An easy-paced walk, preferably outdoors, can ease cramps and lift your mood.',
          why: 'Walking releases endorphins and relaxes the muscles, and daylight supports your mood when hormones are at their lowest.',
        },
        {
          id: 'men-mov-4',
          title: 'Stretches for back and hips',
          body: 'Child’s pose, cat-cow or knees to chest, 30 seconds each, can release tension in your lower back.',
          why: 'The contractions of the uterus, caused by prostaglandins, are often felt in the back and thighs too. Stretching relaxes the muscles around.',
        },
        {
          id: 'men-mov-5',
          title: 'Breathe into your belly',
          body: 'Breathe in slowly through your nose for five seconds, letting your belly rise, then out through your mouth for six seconds. Repeat for a few minutes.',
          why: 'Slow breathing calms the nervous system and can change how you feel pain on days when prostaglandins make the uterus contract.',
        },
        {
          id: 'men-mov-6',
          title: 'Train by your energy',
          body: 'If you feel good, your usual workout is fine. If not, shorten it or choose a lighter version.',
          why: 'Low hormone levels don’t affect everyone the same way. Some people even have more energy towards the end of their period, when oestrogen starts to rise.',
        },
        {
          id: 'men-mov-7',
          title: 'Swimming or easy cycling',
          body: 'Rhythmic movements without jumping are often more comfortable on heavy-flow days.',
          why: 'Gentle rhythmic movement supports circulation and releases endorphins without straining a sensitive belly on days when the uterus contracts.',
        },
      ],
      sleep: [
        {
          id: 'men-sle-1',
          title: 'Warmth before bed',
          body: 'A hot-water bottle on your belly or a warm shower can relax your muscles and help you fall asleep.',
          why: 'Warmth relaxes the muscles of the uterus and reduces the cramps caused by prostaglandins, which could otherwise wake you at night.',
        },
        {
          id: 'men-sle-2',
          title: 'Regular hours',
          body: 'Go to bed and get up close to your usual times. The tiredness of the first days is felt less after regular sleep.',
          why: 'When hormones are at their lowest, tiredness is felt more strongly. A regular schedule helps your body clock make up for it.',
        },
        {
          id: 'men-sle-3',
          title: 'Sleep on your side, with a pillow',
          body: 'Sleeping on your side with a pillow between your knees can reduce pressure on your belly and back.',
          why: 'A slightly curled position relaxes the abdominal muscles around the uterus, which contracts during these days.',
        },
        {
          id: 'men-sle-4',
          title: 'The right protection for the night',
          body: 'A night pad, a cup or period underwear that suits your flow saves you from waking up to check.',
          why: 'Flow is usually heavier in the first two days, after the sudden drop in progesterone. The right protection means unbroken sleep.',
        },
        {
          id: 'men-sle-5',
          title: 'A cool, dark room',
          body: 'A room at around 18–19 °C and complete darkness help with deeper sleep.',
          why: 'Without progesterone, body temperature is lower during these days. A cool room helps the body slip easily into deep sleep.',
        },
        {
          id: 'men-sle-6',
          title: 'A short nap',
          body: 'If you are very tired, a 20-minute nap before 3 pm can refresh you without spoiling your night’s sleep.',
          why: 'Blood loss and low hormone levels can make the first days more tiring. A short nap recharges you without disturbing your night-time rhythm.',
        },
        {
          id: 'men-sle-7',
          title: 'No caffeine in the afternoon',
          body: 'Coffee, black tea or energy drinks after 2 pm can make it harder to fall asleep.',
          why: 'Caffeine narrows blood vessels and can make cramps worse for some people, and its wake-up effect lasts many hours.',
        },
      ],
      skin: [
        {
          id: 'men-ski-1',
          title: 'A simple routine',
          body: 'Your skin may be more sensitive and drier. A gentle cleanser and a moisturiser are enough.',
          why: 'With oestrogen at its lowest, the skin makes fewer moisturising substances and can become drier and more sensitive.',
        },
        {
          id: 'men-ski-2',
          title: 'Put off harsh treatments',
          body: 'Waxing or strong exfoliation can be more painful during these days. If you can, book them for later.',
          why: 'Sensitivity to pain tends to be higher during your period, and the skin reacts more easily to irritation when hormones are at their lowest.',
        },
        {
          id: 'men-ski-3',
          title: 'A richer cream at night',
          body: 'If your skin feels tight, use a cream with ceramides or glycerine in the evening.',
          why: 'Oestrogen helps the skin hold on to water. When it is at its lowest, the skin barrier loses more moisture.',
        },
        {
          id: 'men-ski-4',
          title: 'Water and sleep for dark circles',
          body: 'Enough fluids and regular sleep can reduce the tired look of the first days.',
          why: 'Blood loss and low hormone levels can show on the skin as paleness or more visible dark circles.',
        },
        {
          id: 'men-ski-5',
          title: 'Wash your face after exercise',
          body: 'Sweat left on the skin can irritate, especially when your skin is more sensitive.',
          why: 'The skin is more reactive during these days, because oestrogen, which protects it, is at its lowest.',
        },
        {
          id: 'men-ski-6',
          title: 'Gentle intimate care',
          body: 'Change your pad or tampon regularly and wash the area only with water or a gentle, fragrance-free product.',
          why: 'Blood temporarily changes the acidity of the intimate area, and fragrances and friction can irritate the more sensitive skin of these days.',
        },
        {
          id: 'men-ski-7',
          title: 'Moisturised lips and hands',
          body: 'A lip balm and a hand cream within reach help dry skin.',
          why: 'The dryness comes from low oestrogen, which helps the skin keep its water during the rest of the cycle.',
        },
      ],
    },
  },
  follicular: {
    summary: 'After your period, oestrogen rises gradually. Many people feel more energy and a better mood.',
    hormones:
      'After your period, the pituitary gland sends the hormone FSH to the ovaries, where follicles mature. They produce oestrogen, which rises from day to day. Oestrogen rebuilds the uterine lining and also affects the brain: many people notice more energy, focus and a better mood.',
    tips: {
      nutrition: [
        {
          id: 'fol-nut-1',
          title: 'A varied plate',
          body: 'Vegetables, whole grains, protein and good fats. There is no special diet for this phase; variety is what counts.',
          why: 'In this phase the body rebuilds its reserves after your period and builds the new uterine lining, driven by oestrogen. Variety gives it everything it needs.',
        },
        {
          id: 'fol-nut-2',
          title: 'Protein at every meal',
          body: 'If you move more, protein from eggs, dairy, pulses, fish or meat supports muscle recovery.',
          why: 'With oestrogen rising, many people have energy for more movement, and protein helps muscles recover after exercise.',
        },
        {
          id: 'fol-nut-3',
          title: 'Try a new food',
          body: 'Choose a vegetable or a recipe you haven’t cooked before. Energy and curiosity are often higher now.',
          why: 'Oestrogen boosts dopamine, which supports motivation and curiosity. It is a good time for new habits.',
        },
        {
          id: 'fol-nut-4',
          title: 'Fermented foods',
          body: 'Yoghurt, kefir, sauerkraut or brine pickles can support your gut flora.',
          why: 'The gut helps clear the oestrogen the body has used. A balanced gut flora helps this process run normally.',
        },
        {
          id: 'fol-nut-5',
          title: 'Top up your iron',
          body: 'Keep pulses, leafy greens or meat on the menu for a few more days, alongside raw vegetables rich in vitamin C.',
          why: 'Right after your period iron reserves may be lower, and the body needs iron for the energy that rises with oestrogen.',
        },
        {
          id: 'fol-nut-6',
          title: 'Good carbs before exercise',
          body: 'Oats, wholemeal bread or sweet potatoes, one or two hours before a workout, give steady energy.',
          why: 'In the follicular phase insulin sensitivity tends to be better, so muscles use carbohydrates efficiently.',
        },
        {
          id: 'fol-nut-7',
          title: 'Seeds in yoghurt or salad',
          body: 'A spoonful of flax, pumpkin or sunflower seeds adds fibre and good fats.',
          why: 'Fibre helps the gut clear used oestrogen, and good fats are the raw material the body makes hormones from.',
        },
      ],
      movement: [
        {
          id: 'fol-mov-1',
          title: 'A good time for effort',
          body: 'If you feel more energy, you can try harder workouts or something new: running, strength exercises, dancing.',
          why: 'Rising oestrogen supports energy, endurance and muscle recovery, so harder effort may feel easier now.',
        },
        {
          id: 'fol-mov-2',
          title: 'Build up gradually',
          body: 'Increase duration or intensity step by step, to avoid injuries.',
          why: 'Even if energy rises with oestrogen, muscles and tendons need time to get used to a new effort.',
        },
        {
          id: 'fol-mov-3',
          title: 'Strength exercises',
          body: 'Two or three workouts a week with weights, resistance bands or your own body weight strengthen muscles and bones.',
          why: 'Oestrogen protects muscles and bones. Many people feel they make strength progress more easily in this phase.',
        },
        {
          id: 'fol-mov-4',
          title: 'Try a new sport',
          body: 'A dance class, a new running route or a sport you keep putting off.',
          why: 'Oestrogen raises dopamine and serotonin, which support motivation and the wish to try new things.',
        },
        {
          id: 'fol-mov-5',
          title: 'Short intervals',
          body: 'Alternate one minute of hard effort with two easy minutes, 5–6 times, on a bike or running.',
          why: 'In the follicular phase the body seems to handle intense effort well and recover from it quickly.',
        },
        {
          id: 'fol-mov-6',
          title: 'Move with someone',
          body: 'Plan a walk, a hike or a team sport with friends.',
          why: 'As oestrogen rises, many people feel more sociable, and moving together is easier to keep up.',
        },
        {
          id: 'fol-mov-7',
          title: 'Track your progress',
          body: 'Write down distance, weights or duration. You will see how your form varies across your cycle.',
          why: 'Hormones change your energy from one phase to the next. Notes help you plan your effort around your own pattern.',
        },
      ],
      sleep: [
        {
          id: 'fol-sle-1',
          title: 'Keep your rhythm',
          body: 'Even if you have energy, seven to nine hours of sleep remain the guide for most adults.',
          why: 'Oestrogen favours restful sleep, but daytime energy can tempt you to go to bed late. A steady rhythm keeps the benefit.',
        },
        {
          id: 'fol-sle-2',
          title: 'Morning light',
          body: 'Daylight in the first part of the day helps your body clock and falling asleep in the evening.',
          why: 'Morning light regulates melatonin and cortisol, and a steady body clock also supports the balance of cycle hormones.',
        },
        {
          id: 'fol-sle-3',
          title: 'Dinner hours before bed',
          body: 'Try to eat at least two or three hours before going to bed.',
          why: 'To fall asleep, body temperature drops a little. In the follicular phase, without progesterone, it is already lower, and an early dinner doesn’t push it back up.',
        },
        {
          id: 'fol-sle-4',
          title: 'Hard workouts earlier',
          body: 'Finish intense exercise at least three hours before bed, to let your body settle.',
          why: 'Intense effort raises temperature and adrenaline. With the high energy oestrogen brings, it is tempting to train late in the evening.',
        },
        {
          id: 'fol-sle-5',
          title: 'A short evening ritual',
          body: 'The same sequence every evening (shower, reading, dim light) tells your body that sleep is coming.',
          why: 'A steady habit helps the brain release melatonin on time, and the rhythm you build now also helps in phases when sleep is more fragile.',
        },
        {
          id: 'fol-sle-6',
          title: 'Phone away from the bed',
          body: 'Charge your phone in another room, or at least away from the bed.',
          why: 'Screen light delays melatonin. With the high energy oestrogen brings, your phone can keep you wired longer than you realise.',
        },
        {
          id: 'fol-sle-7',
          title: 'Catch up on lost sleep',
          body: 'If you slept badly during your period, now is the time to catch up.',
          why: 'Oestrogen favours deeper, less broken sleep, so rest in this phase is usually more effective.',
        },
      ],
      skin: [
        {
          id: 'fol-ski-1',
          title: 'Moisture and sun protection',
          body: 'Your skin is often more balanced now. A moisturiser and daily sun protection are the basics.',
          why: 'Oestrogen boosts collagen and hydration, so the skin often looks better now. Sun protection keeps that effect.',
        },
        {
          id: 'fol-ski-2',
          title: 'New products, one at a time',
          body: 'If you want to try a new product, introduce one at a time to see how your skin reacts.',
          why: 'The skin is more stable while oestrogen rises, so it is easier to see how it reacts to a new product.',
        },
        {
          id: 'fol-ski-3',
          title: 'Gentle exfoliation, once a week',
          body: 'A gentle chemical exfoliant or a soft cloth removes dead cells.',
          why: 'The skin renews itself better while oestrogen rises, and light exfoliation gives it room to glow.',
        },
        {
          id: 'fol-ski-4',
          title: 'Book hair removal now',
          body: 'Waxing, plucking or beauty treatments are often more bearable during these days.',
          why: 'As oestrogen rises, sensitivity to pain tends to drop compared with your period days.',
        },
        {
          id: 'fol-ski-5',
          title: 'Vitamin C serum in the morning',
          body: 'A vitamin C serum, under your moisturiser and sun protection, can even out your skin tone.',
          why: 'Vitamin C supports collagen production, which oestrogen already boosts in this phase.',
        },
        {
          id: 'fol-ski-6',
          title: 'Hydrate from the inside',
          body: 'Drinking water regularly shows on your skin too, especially after your period days.',
          why: 'Oestrogen helps the skin hold on to water. When there is enough fluid available, the effect shows better.',
        },
        {
          id: 'fol-ski-7',
          title: 'Remove make-up fully at night',
          body: 'Even if your skin looks good, remove make-up and sun protection before bed.',
          why: 'The balanced skin of this phase stays that way if pores don’t clog overnight, before oil production rises around ovulation.',
        },
      ],
    },
  },
  ovulation: {
    summary:
      'Around ovulation, oestrogen reaches a peak. Some people feel full of energy; others feel a brief pain on one side of the abdomen or notice more abundant, stretchy discharge.',
    hormones:
      'When oestrogen peaks, the pituitary gland suddenly releases the hormone LH, which triggers ovulation: an egg is released from the ovary. Testosterone also rises a little at the same time. After ovulation, the follicle left behind starts making progesterone, and body temperature rises slightly.',
    tips: {
      nutrition: [
        {
          id: 'ovu-nut-1',
          title: 'Water through the day',
          body: 'Body temperature rises slightly after ovulation. Drink water regularly, especially if you exercise.',
          why: 'After ovulation, progesterone raises body temperature by a few tenths of a degree, and the body loses more water through sweat.',
        },
        {
          id: 'ovu-nut-2',
          title: 'Fibre',
          body: 'Vegetables, fruit and whole grains support digestion, which can change a little during these days.',
          why: 'The sudden hormonal changes around ovulation can affect the pace of digestion, and fibre helps keep it regular.',
        },
        {
          id: 'ovu-nut-3',
          title: 'Cruciferous vegetables',
          body: 'Broccoli, cauliflower, cabbage or rocket are easy to add to any meal.',
          why: 'The liver processes the oestrogen that has peaked, and cruciferous vegetables contain compounds studied for their role in this process.',
        },
        {
          id: 'ovu-nut-4',
          title: 'Light, fresh snacks',
          body: 'Fruit, raw vegetables, yoghurt or hummus suit the days when your appetite is smaller.',
          why: 'Around ovulation, high oestrogen tends to reduce appetite, so light meals are often enough.',
        },
        {
          id: 'ovu-nut-5',
          title: 'Zinc from seeds and pulses',
          body: 'Pumpkin seeds, chickpeas, lentils or eggs bring zinc.',
          why: 'Zinc plays a part in making hormones and in skin health, and the skin can get oilier when testosterone rises a little.',
        },
        {
          id: 'ovu-nut-6',
          title: 'A colourful plate',
          body: 'Berries, peppers, tomatoes, leafy greens: the more colours, the more vitamins.',
          why: 'Ovulation comes with a small inflammatory reaction in the ovary. Colourful vegetables and fruit bring antioxidants that support overall balance.',
        },
        {
          id: 'ovu-nut-7',
          title: 'Less alcohol these days',
          body: 'If you drink, choose small portions and alternate with water.',
          why: 'Alcohol loads the liver, which is busy processing the oestrogen peak, and can disturb sleep as body temperature starts to rise.',
        },
      ],
      movement: [
        {
          id: 'ovu-mov-1',
          title: 'Use the energy',
          body: 'If you feel fit, it is a good time for more demanding workouts or group activities.',
          why: 'The oestrogen peak and the small rise in testosterone can bring strength, speed and the urge to move.',
        },
        {
          id: 'ovu-mov-2',
          title: 'A careful warm-up',
          body: 'Warm up well before hard effort, and stop if you feel unusual pain.',
          why: 'High oestrogen makes ligaments slightly more elastic, which, according to some studies, slightly raises the risk of strains.',
        },
        {
          id: 'ovu-mov-3',
          title: 'A team sport or group class',
          body: 'A match, a spinning class or a dance class with others may feel more motivating now.',
          why: 'Many people feel more sociable and confident around ovulation, with the peak in oestrogen and testosterone.',
        },
        {
          id: 'ovu-mov-4',
          title: 'Strength training',
          body: 'Try an extra set or a slightly heavier weight, with well-controlled technique.',
          why: 'High testosterone and oestrogen support muscle strength, and some people get their best results now.',
        },
        {
          id: 'ovu-mov-5',
          title: 'Protect your knees',
          body: 'When jumping or changing direction suddenly, land with your knees slightly bent and in line with your toes.',
          why: 'High oestrogen can make ligaments looser, and good technique protects your joints.',
        },
        {
          id: 'ovu-mov-6',
          title: 'Adjust for ovulation pain',
          body: 'A mild pain lasting a few hours on one side of the abdomen can come with ovulation. If you feel it, choose an easier day.',
          why: 'When the follicle opens to release the egg, a little fluid can irritate the area. The pain usually passes within a day; if it is strong, it is worth discussing with a doctor.',
        },
        {
          id: 'ovu-mov-7',
          title: 'Cool down after exercise',
          body: 'A lukewarm shower and loose clothes after a workout help your body cool down.',
          why: 'Right after ovulation, progesterone raises your baseline body temperature, so you sweat sooner.',
        },
      ],
      sleep: [
        {
          id: 'ovu-sle-1',
          title: 'A cool room',
          body: 'If you feel warmer at night, air the room before bed and choose light bedding.',
          why: 'The progesterone that appears after ovulation raises body temperature, and a warmer body falls asleep less easily.',
        },
        {
          id: 'ovu-sle-2',
          title: 'An evening routine',
          body: 'Put screens away half an hour before bed, especially if your daytime energy keeps you wired.',
          why: 'The oestrogen peak can bring lots of energy and a busy mind; a calm routine helps the brain shift towards sleep.',
        },
        {
          id: 'ovu-sle-3',
          title: 'Cotton pyjamas',
          body: 'Natural fabrics that let your skin breathe help if you sweat at night.',
          why: 'The rise in temperature after ovulation, brought by progesterone, can make nights warmer.',
        },
        {
          id: 'ovu-sle-4',
          title: 'Temperature at the same time',
          body: 'If you log your basal body temperature, take it in the morning, before getting out of bed, always at the same time.',
          why: 'After ovulation, progesterone raises temperature by about 0.2–0.5 °C. Measuring consistently makes this rise show in the chart.',
        },
        {
          id: 'ovu-sle-5',
          title: 'Coffee only in the morning',
          body: 'Having your last coffee before lunch helps your night’s sleep.',
          why: 'With the high energy of the oestrogen peak, extra caffeine can keep you wired until late in the evening.',
        },
        {
          id: 'ovu-sle-6',
          title: 'Quiet your mind before sleep',
          body: 'A few minutes of reading, slow breathing or writing before bed.',
          why: 'Oestrogen stimulates the brain and can keep thoughts busy in the evening; a quiet moment helps the shift towards sleep.',
        },
        {
          id: 'ovu-sle-7',
          title: 'Extra sleep after hard workouts',
          body: 'If you train harder these days, add half an hour of sleep.',
          why: 'Muscles recover in deep sleep. When hormones support hard effort, rest completes the training.',
        },
      ],
      skin: [
        {
          id: 'ovu-ski-1',
          title: 'Gentle cleansing',
          body: 'Your skin may produce more oil. Cleanse your face morning and evening, without scrubbing.',
          why: 'The small rise in testosterone around ovulation stimulates the glands that produce oil.',
        },
        {
          id: 'ovu-ski-2',
          title: 'Products that don’t clog pores',
          body: 'If you notice clogged pores, choose non-comedogenic products.',
          why: 'The extra oil, stimulated by the hormones of this phase, can clog pores more easily.',
        },
        {
          id: 'ovu-ski-3',
          title: 'A light gel moisturiser',
          body: 'Oilier skin feels better with a light texture that moisturises without shine.',
          why: 'The skin produces more oil as testosterone rises, but it still needs water.',
        },
        {
          id: 'ovu-ski-4',
          title: 'A clay mask on the T-zone',
          body: 'A clay mask, once during these days, on your forehead, nose and chin, can absorb extra oil.',
          why: 'The T-zone has the most oil glands, and they are the most sensitive to the small rise in testosterone.',
        },
        {
          id: 'ovu-ski-5',
          title: 'Sun protection, even when cloudy',
          body: 'Use a product with sun protection every day, including on cloudy days.',
          why: 'For some people, high oestrogen makes the skin more prone to dark spots in the sun.',
        },
        {
          id: 'ovu-ski-6',
          title: 'Hands off your face',
          body: 'Hands carry dirt to your face that can clog pores.',
          why: 'With more oil during these days, pores can clog more easily, and added dirt makes this worse.',
        },
        {
          id: 'ovu-ski-7',
          title: 'Change your pillowcase',
          body: 'A clean pillowcase, changed twice a week, helps oilier skin.',
          why: 'The extra oil of this phase collects on the pillow and goes back onto your skin every night.',
        },
      ],
    },
  },
  luteal: {
    summary:
      'After ovulation, progesterone rises. Towards the end of this phase, some people notice bloating, breast tenderness, cravings or mood changes. They are common, but they don’t have to be hard to bear.',
    hormones:
      'After ovulation, the follicle left in the ovary makes progesterone, and oestrogen rises again, less so. Progesterone warms the body, slows digestion and can increase appetite. If there is no pregnancy, both hormones drop in the last days, which can bring bloating, breast tenderness or mood changes, and then your period.',
    tips: {
      nutrition: [
        {
          id: 'lut-nut-1',
          title: 'Regular meals',
          body: 'Meals at regular times, with protein and fibre, can calm cravings and swings in energy.',
          why: 'Progesterone slightly increases the body’s energy use and appetite. Regular meals keep hunger in check.',
        },
        {
          id: 'lut-nut-2',
          title: 'Less salt, coffee and alcohol',
          body: 'For some people, cutting down on them in the days before a period reduces bloating, breast tenderness and irritability.',
          why: 'The drop in hormones in the last days makes the body hold on to water, and salt, caffeine and alcohol can add to this.',
        },
        {
          id: 'lut-nut-3',
          title: 'Carbs that keep you full',
          body: 'Oats, sweet potatoes, brown rice or pulses settle cravings better than sweets.',
          why: 'Before a period, serotonin can drop along with oestrogen, and complex carbohydrates support its production without blood sugar spikes.',
        },
        {
          id: 'lut-nut-4',
          title: 'Calcium from dairy or greens',
          body: 'Yoghurt, cheese, almonds or dark leafy greens bring calcium.',
          why: 'Some studies show that a good calcium intake can reduce symptoms in the days before a period, which are linked to hormonal changes.',
        },
        {
          id: 'lut-nut-5',
          title: 'Dark chocolate, in moderation',
          body: 'If you crave something sweet, a few squares of dark chocolate can be a good choice.',
          why: 'Sweet cravings are linked to the drop in serotonin before a period. Dark chocolate also brings magnesium.',
        },
        {
          id: 'lut-nut-6',
          title: 'A snack ready in advance',
          body: 'Keep a filling snack within reach: nuts, fruit with yoghurt, or hummus with vegetables.',
          why: 'Progesterone can increase appetite in the second half of the cycle, and a planned snack prevents choices made on the run.',
        },
        {
          id: 'lut-nut-7',
          title: 'Foods with vitamin B6',
          body: 'Bananas, chickpeas, fish or potatoes bring vitamin B6.',
          why: 'Vitamin B6 plays a part in making serotonin, which can drop in the days before a period.',
        },
      ],
      movement: [
        {
          id: 'lut-mov-1',
          title: 'Moderate effort',
          body: 'Walking, swimming or cycling can help mood and bloating. If your energy drops, choose a lighter effort.',
          why: 'Progesterone raises body temperature and heart rate, so the same effort can feel harder than in the first half of the cycle.',
        },
        {
          id: 'lut-mov-2',
          title: 'Stretching and breathing',
          body: 'A few minutes of stretching or slow breathing can ease the tension of the days before a period.',
          why: 'The drop in hormones before a period can increase tension and irritability; slow breathing calms the nervous system.',
        },
        {
          id: 'lut-mov-3',
          title: 'Pilates or yoga',
          body: 'A 20–30-minute pilates or yoga session works your muscles without wearing you out.',
          why: 'In the luteal phase many people recover more slowly from hard effort, and controlled movement keeps strength without extra stress.',
        },
        {
          id: 'lut-mov-4',
          title: 'Water at hand when training',
          body: 'Take a bottle of water with you and drink a little at every break.',
          why: 'Progesterone raises body temperature, and sweating starts earlier during exercise.',
        },
        {
          id: 'lut-mov-5',
          title: 'A walk after a meal',
          body: 'Ten to fifteen minutes of walking after your main meal.',
          why: 'Progesterone slows digestion; an easy walk after a meal can reduce bloating and the feeling of heaviness.',
        },
        {
          id: 'lut-mov-6',
          title: 'Adjust the intensity',
          body: 'If a usual workout feels harder, lower the pace or the weight a little, without giving up.',
          why: 'Higher temperature and heart rate in this phase make effort feel more demanding, even if your strength stays the same.',
        },
        {
          id: 'lut-mov-7',
          title: 'Movement outdoors',
          body: 'An easy hike or a walk in the park combines movement with daylight.',
          why: 'Light and movement support serotonin, which tends to drop in the last days before a period.',
        },
      ],
      sleep: [
        {
          id: 'lut-sle-1',
          title: 'More time for sleep',
          body: 'Sleep can be more restless before a period. Go to bed a little earlier and avoid coffee in the afternoon.',
          why: 'The drop in progesterone in the last days of the cycle can make sleep lighter and more broken.',
        },
        {
          id: 'lut-sle-2',
          title: 'Put your thoughts on paper',
          body: 'If your mind won’t switch off in the evening, write down what is on your mind before bed.',
          why: 'Changes in oestrogen and progesterone before a period can heighten worries; written down, they take up less room in the evening.',
        },
        {
          id: 'lut-sle-3',
          title: 'Cool the bedroom',
          body: 'Air the room and choose a thinner duvet.',
          why: 'Progesterone keeps body temperature a few tenths of a degree higher throughout the luteal phase, and heat interrupts sleep.',
        },
        {
          id: 'lut-sle-4',
          title: 'A light dinner',
          body: 'A dinner with vegetables and protein, without very fatty or spicy food, a few hours before bed.',
          why: 'Progesterone slows digestion, and a heavy dinner can bring bloating and restless sleep.',
        },
        {
          id: 'lut-sle-5',
          title: 'A warm, caffeine-free tea',
          body: 'Chamomile, lime blossom or lemon balm tea can be part of your evening ritual.',
          why: 'A warm, calming ritual helps the body relax on days when falling hormones make it harder to fall asleep.',
        },
        {
          id: 'lut-sle-6',
          title: 'Comfort for tender breasts',
          body: 'A soft bralette or a pillow to hug can make sleeping on your side more comfortable.',
          why: 'Progesterone and oestrogen can make breast tissue hold water in the second half of the cycle, hence the tenderness.',
        },
        {
          id: 'lut-sle-7',
          title: 'The same bedtime',
          body: 'Even at weekends, keep your bedtime within an hour of the rest of the week.',
          why: 'The more fragile sleep of the days before a period, linked to falling progesterone, holds up better on a steady schedule.',
        },
      ],
      skin: [
        {
          id: 'lut-ski-1',
          title: 'Watch for breakouts',
          body: 'Spots can appear before a period. Products with salicylic acid or benzoyl peroxide may help; use them as the leaflet says.',
          why: 'When oestrogen drops at the end of the cycle, the effect of testosterone becomes relatively stronger, and oil glands produce more.',
        },
        {
          id: 'lut-ski-2',
          title: 'Don’t squeeze spots',
          body: 'Touching and squeezing can leave marks. If acne bothers you all the time, a dermatologist can suggest a treatment.',
          why: 'Inflamed skin in this phase heals more slowly if it is touched, and marks last longer.',
        },
        {
          id: 'lut-ski-3',
          title: 'Cleanse after exercise',
          body: 'Wash your face as soon as you can after sweating.',
          why: 'Progesterone raises temperature and sweating, and sweat mixed with oil can clog pores.',
        },
        {
          id: 'lut-ski-4',
          title: 'A cold compress in the morning',
          body: 'A cold compress for a few minutes in the morning can reduce puffiness in your face.',
          why: 'Water retention before a period, linked to hormonal changes, often shows on the face, especially in the morning.',
        },
        {
          id: 'lut-ski-5',
          title: 'Treat the spot, not the whole face',
          body: 'Apply spot products only where spots have appeared, so you don’t dry out the rest of your skin.',
          why: 'Hormonal breakouts usually appear on the chin and jawline, and the rest of the skin still needs moisture.',
        },
        {
          id: 'lut-ski-6',
          title: 'A towel just for your face',
          body: 'A clean towel used only for your face and changed often reduces the dirt that reaches your skin.',
          why: 'With oil glands more active in this phase, clogged pores get inflamed more easily.',
        },
        {
          id: 'lut-ski-7',
          title: 'A moment of pampering',
          body: 'A warm bath or a longer skincare routine in the evening can be a way to relax.',
          why: 'The drop in hormones before a period can bring tension and irritability; caring for your body helps your mood too.',
        },
      ],
    },
  },
};
