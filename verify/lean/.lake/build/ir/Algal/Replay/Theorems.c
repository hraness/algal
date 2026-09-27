// Lean compiler output
// Module: Algal.Replay.Theorems
// Imports: public import Init public meta import Init public import Algal.Replay.Model
#include <lean/lean.h>
#if defined(__clang__)
#pragma clang diagnostic ignored "-Wunused-parameter"
#pragma clang diagnostic ignored "-Wunused-label"
#elif defined(__GNUC__) && !defined(__CLANG__)
#pragma GCC diagnostic ignored "-Wunused-parameter"
#pragma GCC diagnostic ignored "-Wunused-label"
#pragma GCC diagnostic ignored "-Wunused-but-set-variable"
#endif
#ifdef __cplusplus
extern "C" {
#endif
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* lean_nat_sub(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_serve_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_serve_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__7_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__7_splitter___redArg___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__7_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__7_splitter___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__5_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__5_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__3_splitter___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__3_splitter(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_dropSuspended_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_dropSuspended_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__1_splitter___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__1_splitter(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_resolveSlotRead_match__3_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_resolveSlotRead_match__3_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_resolveSlotRead_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_resolveSlotRead_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_serve_match__1_splitter___redArg(lean_object* v_x_1_, lean_object* v_x_2_, lean_object* v_h__1_3_, lean_object* v_h__2_4_){
_start:
{
if (lean_obj_tag(v_x_1_) == 0)
{
lean_object* v___x_5_; 
lean_dec(v_h__2_4_);
v___x_5_ = lean_apply_1(v_h__1_3_, v_x_2_);
return v___x_5_;
}
else
{
lean_object* v_head_6_; lean_object* v_tail_7_; lean_object* v___x_8_; 
lean_dec(v_h__1_3_);
v_head_6_ = lean_ctor_get(v_x_1_, 0);
lean_inc(v_head_6_);
v_tail_7_ = lean_ctor_get(v_x_1_, 1);
lean_inc(v_tail_7_);
lean_dec_ref_known(v_x_1_, 2);
v___x_8_ = lean_apply_3(v_h__2_4_, v_head_6_, v_tail_7_, v_x_2_);
return v___x_8_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_serve_match__1_splitter(lean_object* v_motive_9_, lean_object* v_x_10_, lean_object* v_x_11_, lean_object* v_h__1_12_, lean_object* v_h__2_13_){
_start:
{
if (lean_obj_tag(v_x_10_) == 0)
{
lean_object* v___x_14_; 
lean_dec(v_h__2_13_);
v___x_14_ = lean_apply_1(v_h__1_12_, v_x_11_);
return v___x_14_;
}
else
{
lean_object* v_head_15_; lean_object* v_tail_16_; lean_object* v___x_17_; 
lean_dec(v_h__1_12_);
v_head_15_ = lean_ctor_get(v_x_10_, 0);
lean_inc(v_head_15_);
v_tail_16_ = lean_ctor_get(v_x_10_, 1);
lean_inc(v_tail_16_);
lean_dec_ref_known(v_x_10_, 2);
v___x_17_ = lean_apply_3(v_h__2_13_, v_head_15_, v_tail_16_, v_x_11_);
return v___x_17_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__7_splitter___redArg(lean_object* v_x_18_, lean_object* v_x_19_, lean_object* v_h__1_20_, lean_object* v_h__2_21_){
_start:
{
lean_object* v_zero_22_; uint8_t v_isZero_23_; 
v_zero_22_ = lean_unsigned_to_nat(0u);
v_isZero_23_ = lean_nat_dec_eq(v_x_18_, v_zero_22_);
if (v_isZero_23_ == 1)
{
lean_object* v___x_24_; 
lean_dec(v_h__2_21_);
v___x_24_ = lean_apply_1(v_h__1_20_, v_x_19_);
return v___x_24_;
}
else
{
lean_object* v_one_25_; lean_object* v_n_26_; lean_object* v___x_27_; 
lean_dec(v_h__1_20_);
v_one_25_ = lean_unsigned_to_nat(1u);
v_n_26_ = lean_nat_sub(v_x_18_, v_one_25_);
v___x_27_ = lean_apply_2(v_h__2_21_, v_n_26_, v_x_19_);
return v___x_27_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__7_splitter___redArg___boxed(lean_object* v_x_28_, lean_object* v_x_29_, lean_object* v_h__1_30_, lean_object* v_h__2_31_){
_start:
{
lean_object* v_res_32_; 
v_res_32_ = lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__7_splitter___redArg(v_x_28_, v_x_29_, v_h__1_30_, v_h__2_31_);
lean_dec(v_x_28_);
return v_res_32_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__7_splitter(lean_object* v_motive_33_, lean_object* v_x_34_, lean_object* v_x_35_, lean_object* v_h__1_36_, lean_object* v_h__2_37_){
_start:
{
lean_object* v_zero_38_; uint8_t v_isZero_39_; 
v_zero_38_ = lean_unsigned_to_nat(0u);
v_isZero_39_ = lean_nat_dec_eq(v_x_34_, v_zero_38_);
if (v_isZero_39_ == 1)
{
lean_object* v___x_40_; 
lean_dec(v_h__2_37_);
v___x_40_ = lean_apply_1(v_h__1_36_, v_x_35_);
return v___x_40_;
}
else
{
lean_object* v_one_41_; lean_object* v_n_42_; lean_object* v___x_43_; 
lean_dec(v_h__1_36_);
v_one_41_ = lean_unsigned_to_nat(1u);
v_n_42_ = lean_nat_sub(v_x_34_, v_one_41_);
v___x_43_ = lean_apply_2(v_h__2_37_, v_n_42_, v_x_35_);
return v___x_43_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__7_splitter___boxed(lean_object* v_motive_44_, lean_object* v_x_45_, lean_object* v_x_46_, lean_object* v_h__1_47_, lean_object* v_h__2_48_){
_start:
{
lean_object* v_res_49_; 
v_res_49_ = lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__7_splitter(v_motive_44_, v_x_45_, v_x_46_, v_h__1_47_, v_h__2_48_);
lean_dec(v_x_45_);
return v_res_49_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__5_splitter___redArg(lean_object* v_x_50_, lean_object* v_h__1_51_, lean_object* v_h__2_52_, lean_object* v_h__3_53_, lean_object* v_h__4_54_){
_start:
{
switch(lean_obj_tag(v_x_50_))
{
case 0:
{
lean_object* v_a_55_; lean_object* v___x_56_; 
lean_dec(v_h__4_54_);
lean_dec(v_h__3_53_);
lean_dec(v_h__1_51_);
v_a_55_ = lean_ctor_get(v_x_50_, 0);
lean_inc_ref(v_a_55_);
lean_dec_ref_known(v_x_50_, 1);
v___x_56_ = lean_apply_1(v_h__2_52_, v_a_55_);
return v___x_56_;
}
case 1:
{
lean_object* v_path_57_; lean_object* v_name_58_; lean_object* v___x_59_; 
lean_dec(v_h__4_54_);
lean_dec(v_h__2_52_);
lean_dec(v_h__1_51_);
v_path_57_ = lean_ctor_get(v_x_50_, 0);
lean_inc_ref(v_path_57_);
v_name_58_ = lean_ctor_get(v_x_50_, 1);
lean_inc_ref(v_name_58_);
lean_dec_ref_known(v_x_50_, 2);
v___x_59_ = lean_apply_2(v_h__3_53_, v_path_57_, v_name_58_);
return v___x_59_;
}
case 2:
{
lean_object* v_path_60_; lean_object* v_name_61_; lean_object* v_data_62_; lean_object* v___x_63_; 
lean_dec(v_h__3_53_);
lean_dec(v_h__2_52_);
lean_dec(v_h__1_51_);
v_path_60_ = lean_ctor_get(v_x_50_, 0);
lean_inc_ref(v_path_60_);
v_name_61_ = lean_ctor_get(v_x_50_, 1);
lean_inc_ref(v_name_61_);
v_data_62_ = lean_ctor_get(v_x_50_, 2);
lean_inc(v_data_62_);
lean_dec_ref_known(v_x_50_, 3);
v___x_63_ = lean_apply_3(v_h__4_54_, v_path_60_, v_name_61_, v_data_62_);
return v___x_63_;
}
default: 
{
uint8_t v_outcome_64_; lean_object* v_failure_65_; lean_object* v___x_66_; lean_object* v___x_67_; 
lean_dec(v_h__4_54_);
lean_dec(v_h__3_53_);
lean_dec(v_h__2_52_);
v_outcome_64_ = lean_ctor_get_uint8(v_x_50_, sizeof(void*)*1);
v_failure_65_ = lean_ctor_get(v_x_50_, 0);
lean_inc(v_failure_65_);
lean_dec_ref_known(v_x_50_, 1);
v___x_66_ = lean_box(v_outcome_64_);
v___x_67_ = lean_apply_2(v_h__1_51_, v___x_66_, v_failure_65_);
return v___x_67_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__5_splitter(lean_object* v_motive_68_, lean_object* v_x_69_, lean_object* v_h__1_70_, lean_object* v_h__2_71_, lean_object* v_h__3_72_, lean_object* v_h__4_73_){
_start:
{
switch(lean_obj_tag(v_x_69_))
{
case 0:
{
lean_object* v_a_74_; lean_object* v___x_75_; 
lean_dec(v_h__4_73_);
lean_dec(v_h__3_72_);
lean_dec(v_h__1_70_);
v_a_74_ = lean_ctor_get(v_x_69_, 0);
lean_inc_ref(v_a_74_);
lean_dec_ref_known(v_x_69_, 1);
v___x_75_ = lean_apply_1(v_h__2_71_, v_a_74_);
return v___x_75_;
}
case 1:
{
lean_object* v_path_76_; lean_object* v_name_77_; lean_object* v___x_78_; 
lean_dec(v_h__4_73_);
lean_dec(v_h__2_71_);
lean_dec(v_h__1_70_);
v_path_76_ = lean_ctor_get(v_x_69_, 0);
lean_inc_ref(v_path_76_);
v_name_77_ = lean_ctor_get(v_x_69_, 1);
lean_inc_ref(v_name_77_);
lean_dec_ref_known(v_x_69_, 2);
v___x_78_ = lean_apply_2(v_h__3_72_, v_path_76_, v_name_77_);
return v___x_78_;
}
case 2:
{
lean_object* v_path_79_; lean_object* v_name_80_; lean_object* v_data_81_; lean_object* v___x_82_; 
lean_dec(v_h__3_72_);
lean_dec(v_h__2_71_);
lean_dec(v_h__1_70_);
v_path_79_ = lean_ctor_get(v_x_69_, 0);
lean_inc_ref(v_path_79_);
v_name_80_ = lean_ctor_get(v_x_69_, 1);
lean_inc_ref(v_name_80_);
v_data_81_ = lean_ctor_get(v_x_69_, 2);
lean_inc(v_data_81_);
lean_dec_ref_known(v_x_69_, 3);
v___x_82_ = lean_apply_3(v_h__4_73_, v_path_79_, v_name_80_, v_data_81_);
return v___x_82_;
}
default: 
{
uint8_t v_outcome_83_; lean_object* v_failure_84_; lean_object* v___x_85_; lean_object* v___x_86_; 
lean_dec(v_h__4_73_);
lean_dec(v_h__3_72_);
lean_dec(v_h__2_71_);
v_outcome_83_ = lean_ctor_get_uint8(v_x_69_, sizeof(void*)*1);
v_failure_84_ = lean_ctor_get(v_x_69_, 0);
lean_inc(v_failure_84_);
lean_dec_ref_known(v_x_69_, 1);
v___x_85_ = lean_box(v_outcome_83_);
v___x_86_ = lean_apply_2(v_h__1_70_, v___x_85_, v_failure_84_);
return v___x_86_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__3_splitter___redArg(lean_object* v_x_87_, lean_object* v_h__1_88_){
_start:
{
lean_object* v_fst_89_; lean_object* v_snd_90_; lean_object* v___x_91_; 
v_fst_89_ = lean_ctor_get(v_x_87_, 0);
lean_inc(v_fst_89_);
v_snd_90_ = lean_ctor_get(v_x_87_, 1);
lean_inc(v_snd_90_);
lean_dec_ref(v_x_87_);
v___x_91_ = lean_apply_2(v_h__1_88_, v_fst_89_, v_snd_90_);
return v___x_91_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__3_splitter(lean_object* v_motive_92_, lean_object* v_x_93_, lean_object* v_h__1_94_){
_start:
{
lean_object* v_fst_95_; lean_object* v_snd_96_; lean_object* v___x_97_; 
v_fst_95_ = lean_ctor_get(v_x_93_, 0);
lean_inc(v_fst_95_);
v_snd_96_ = lean_ctor_get(v_x_93_, 1);
lean_inc(v_snd_96_);
lean_dec_ref(v_x_93_);
v___x_97_ = lean_apply_2(v_h__1_94_, v_fst_95_, v_snd_96_);
return v___x_97_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_dropSuspended_match__1_splitter___redArg(lean_object* v_x_98_, lean_object* v_h__1_99_, lean_object* v_h__2_100_){
_start:
{
if (lean_obj_tag(v_x_98_) == 2)
{
lean_object* v___x_101_; lean_object* v___x_102_; 
lean_dec(v_h__2_100_);
v___x_101_ = lean_box(0);
v___x_102_ = lean_apply_1(v_h__1_99_, v___x_101_);
return v___x_102_;
}
else
{
lean_object* v___x_103_; 
lean_dec(v_h__1_99_);
v___x_103_ = lean_apply_2(v_h__2_100_, v_x_98_, lean_box(0));
return v___x_103_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_dropSuspended_match__1_splitter(lean_object* v_motive_104_, lean_object* v_x_105_, lean_object* v_h__1_106_, lean_object* v_h__2_107_){
_start:
{
if (lean_obj_tag(v_x_105_) == 2)
{
lean_object* v___x_108_; lean_object* v___x_109_; 
lean_dec(v_h__2_107_);
v___x_108_ = lean_box(0);
v___x_109_ = lean_apply_1(v_h__1_106_, v___x_108_);
return v___x_109_;
}
else
{
lean_object* v___x_110_; 
lean_dec(v_h__1_106_);
v___x_110_ = lean_apply_2(v_h__2_107_, v_x_105_, lean_box(0));
return v___x_110_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__1_splitter___redArg(lean_object* v_x_111_, lean_object* v_h__1_112_){
_start:
{
lean_object* v_snd_113_; lean_object* v_fst_114_; lean_object* v_fst_115_; lean_object* v_snd_116_; lean_object* v___x_117_; 
v_snd_113_ = lean_ctor_get(v_x_111_, 1);
lean_inc(v_snd_113_);
v_fst_114_ = lean_ctor_get(v_x_111_, 0);
lean_inc(v_fst_114_);
lean_dec_ref(v_x_111_);
v_fst_115_ = lean_ctor_get(v_snd_113_, 0);
lean_inc(v_fst_115_);
v_snd_116_ = lean_ctor_get(v_snd_113_, 1);
lean_inc(v_snd_116_);
lean_dec(v_snd_113_);
v___x_117_ = lean_apply_3(v_h__1_112_, v_fst_114_, v_fst_115_, v_snd_116_);
return v___x_117_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_steps_match__1_splitter(lean_object* v_motive_118_, lean_object* v_x_119_, lean_object* v_h__1_120_){
_start:
{
lean_object* v_snd_121_; lean_object* v_fst_122_; lean_object* v_fst_123_; lean_object* v_snd_124_; lean_object* v___x_125_; 
v_snd_121_ = lean_ctor_get(v_x_119_, 1);
lean_inc(v_snd_121_);
v_fst_122_ = lean_ctor_get(v_x_119_, 0);
lean_inc(v_fst_122_);
lean_dec_ref(v_x_119_);
v_fst_123_ = lean_ctor_get(v_snd_121_, 0);
lean_inc(v_fst_123_);
v_snd_124_ = lean_ctor_get(v_snd_121_, 1);
lean_inc(v_snd_124_);
lean_dec(v_snd_121_);
v___x_125_ = lean_apply_3(v_h__1_120_, v_fst_122_, v_fst_123_, v_snd_124_);
return v___x_125_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_resolveSlotRead_match__3_splitter___redArg(lean_object* v_x_126_, lean_object* v_h__1_127_, lean_object* v_h__2_128_, lean_object* v_h__3_129_){
_start:
{
if (lean_obj_tag(v_x_126_) == 0)
{
lean_object* v___x_130_; lean_object* v___x_131_; 
lean_dec(v_h__2_128_);
lean_dec(v_h__1_127_);
v___x_130_ = lean_box(0);
v___x_131_ = lean_apply_1(v_h__3_129_, v___x_130_);
return v___x_131_;
}
else
{
lean_object* v_val_132_; 
lean_dec(v_h__3_129_);
v_val_132_ = lean_ctor_get(v_x_126_, 0);
lean_inc(v_val_132_);
lean_dec_ref_known(v_x_126_, 1);
if (lean_obj_tag(v_val_132_) == 0)
{
lean_object* v___x_133_; lean_object* v___x_134_; 
lean_dec(v_h__1_127_);
v___x_133_ = lean_box(0);
v___x_134_ = lean_apply_1(v_h__2_128_, v___x_133_);
return v___x_134_;
}
else
{
lean_object* v_val_135_; lean_object* v___x_136_; 
lean_dec(v_h__2_128_);
v_val_135_ = lean_ctor_get(v_val_132_, 0);
lean_inc(v_val_135_);
lean_dec_ref_known(v_val_132_, 1);
v___x_136_ = lean_apply_1(v_h__1_127_, v_val_135_);
return v___x_136_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_resolveSlotRead_match__3_splitter(lean_object* v_motive_137_, lean_object* v_x_138_, lean_object* v_h__1_139_, lean_object* v_h__2_140_, lean_object* v_h__3_141_){
_start:
{
if (lean_obj_tag(v_x_138_) == 0)
{
lean_object* v___x_142_; lean_object* v___x_143_; 
lean_dec(v_h__2_140_);
lean_dec(v_h__1_139_);
v___x_142_ = lean_box(0);
v___x_143_ = lean_apply_1(v_h__3_141_, v___x_142_);
return v___x_143_;
}
else
{
lean_object* v_val_144_; 
lean_dec(v_h__3_141_);
v_val_144_ = lean_ctor_get(v_x_138_, 0);
lean_inc(v_val_144_);
lean_dec_ref_known(v_x_138_, 1);
if (lean_obj_tag(v_val_144_) == 0)
{
lean_object* v___x_145_; lean_object* v___x_146_; 
lean_dec(v_h__1_139_);
v___x_145_ = lean_box(0);
v___x_146_ = lean_apply_1(v_h__2_140_, v___x_145_);
return v___x_146_;
}
else
{
lean_object* v_val_147_; lean_object* v___x_148_; 
lean_dec(v_h__2_140_);
v_val_147_ = lean_ctor_get(v_val_144_, 0);
lean_inc(v_val_147_);
lean_dec_ref_known(v_val_144_, 1);
v___x_148_ = lean_apply_1(v_h__1_139_, v_val_147_);
return v___x_148_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_resolveSlotRead_match__1_splitter___redArg(lean_object* v_x_149_, lean_object* v_h__1_150_, lean_object* v_h__2_151_){
_start:
{
if (lean_obj_tag(v_x_149_) == 0)
{
lean_object* v___x_152_; lean_object* v___x_153_; 
lean_dec(v_h__1_150_);
v___x_152_ = lean_box(0);
v___x_153_ = lean_apply_1(v_h__2_151_, v___x_152_);
return v___x_153_;
}
else
{
lean_object* v_val_154_; lean_object* v___x_155_; 
lean_dec(v_h__2_151_);
v_val_154_ = lean_ctor_get(v_x_149_, 0);
lean_inc(v_val_154_);
lean_dec_ref_known(v_x_149_, 1);
v___x_155_ = lean_apply_1(v_h__1_150_, v_val_154_);
return v___x_155_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Replay_Theorems_0__Algal_Replay_resolveSlotRead_match__1_splitter(lean_object* v_motive_156_, lean_object* v_x_157_, lean_object* v_h__1_158_, lean_object* v_h__2_159_){
_start:
{
if (lean_obj_tag(v_x_157_) == 0)
{
lean_object* v___x_160_; lean_object* v___x_161_; 
lean_dec(v_h__1_158_);
v___x_160_ = lean_box(0);
v___x_161_ = lean_apply_1(v_h__2_159_, v___x_160_);
return v___x_161_;
}
else
{
lean_object* v_val_162_; lean_object* v___x_163_; 
lean_dec(v_h__2_159_);
v_val_162_ = lean_ctor_get(v_x_157_, 0);
lean_inc(v_val_162_);
lean_dec_ref_known(v_x_157_, 1);
v___x_163_ = lean_apply_1(v_h__1_158_, v_val_162_);
return v___x_163_;
}
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Replay_Model(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Replay_Theorems(uint8_t builtin) {
lean_object * res;
if (_G_initialized) return lean_io_result_mk_ok(lean_box(0));
_G_initialized = true;
lean_initialize_runtime_module();
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Replay_Model(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
