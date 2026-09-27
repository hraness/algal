// Lean compiler output
// Module: Algal.Core.RationalSelector
// Imports: public import Init public meta import Init public import Algal.Core.RationalBracket
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
lean_object* lp_algalVerification_Algal_Core_RoundingInterval_value(uint64_t);
lean_object* lp_algalVerification_Algal_Core_RoundingInterval_midpoint(lean_object*, lean_object*);
uint8_t l_Rat_blt(lean_object*, lean_object*);
uint8_t lp_algalVerification_Algal_Core_RoundingInterval_instDecidableEven___aux__1(uint64_t);
lean_object* lp_algalVerification_Algal_Core_RationalBracket_bracket(lean_object*);
lean_object* l_Rat_neg(lean_object*);
uint64_t lp_algalVerification_Algal_Core_SignedRounding_negateBits(uint64_t);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RationalSelector_chooseInterior(uint64_t, uint64_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalSelector_chooseInterior___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RationalSelector_selectNonnegative(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalSelector_selectNonnegative___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalSelector_signedInput(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalSelector_signedInput___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RationalSelector_selectSigned(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalSelector_selectSigned___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RationalSelector_0__Algal_Core_RationalSelector_signedInput_match__1_splitter___redArg(uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RationalSelector_0__Algal_Core_RationalSelector_signedInput_match__1_splitter___redArg___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RationalSelector_0__Algal_Core_RationalSelector_signedInput_match__1_splitter(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RationalSelector_0__Algal_Core_RationalSelector_signedInput_match__1_splitter___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RationalSelector_chooseInterior(uint64_t v_lower_1_, uint64_t v_upper_2_, lean_object* v_x_3_){
_start:
{
lean_object* v___x_4_; lean_object* v___x_5_; lean_object* v_middle_6_; uint8_t v___x_7_; 
v___x_4_ = lp_algalVerification_Algal_Core_RoundingInterval_value(v_lower_1_);
v___x_5_ = lp_algalVerification_Algal_Core_RoundingInterval_value(v_upper_2_);
v_middle_6_ = lp_algalVerification_Algal_Core_RoundingInterval_midpoint(v___x_4_, v___x_5_);
lean_inc_ref(v_x_3_);
lean_inc_ref(v_middle_6_);
v___x_7_ = l_Rat_blt(v_middle_6_, v_x_3_);
if (v___x_7_ == 0)
{
uint8_t v___x_8_; 
v___x_8_ = l_Rat_blt(v_x_3_, v_middle_6_);
if (v___x_8_ == 0)
{
uint8_t v___x_9_; 
v___x_9_ = lp_algalVerification_Algal_Core_RoundingInterval_instDecidableEven___aux__1(v_lower_1_);
if (v___x_9_ == 0)
{
return v_upper_2_;
}
else
{
return v_lower_1_;
}
}
else
{
return v_lower_1_;
}
}
else
{
lean_dec_ref(v_middle_6_);
lean_dec_ref(v_x_3_);
return v_upper_2_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalSelector_chooseInterior___boxed(lean_object* v_lower_10_, lean_object* v_upper_11_, lean_object* v_x_12_){
_start:
{
uint64_t v_lower_boxed_13_; uint64_t v_upper_boxed_14_; uint64_t v_res_15_; lean_object* v_r_16_; 
v_lower_boxed_13_ = lean_unbox_uint64(v_lower_10_);
lean_dec_ref(v_lower_10_);
v_upper_boxed_14_ = lean_unbox_uint64(v_upper_11_);
lean_dec_ref(v_upper_11_);
v_res_15_ = lp_algalVerification_Algal_Core_RationalSelector_chooseInterior(v_lower_boxed_13_, v_upper_boxed_14_, v_x_12_);
v_r_16_ = lean_box_uint64(v_res_15_);
return v_r_16_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RationalSelector_selectNonnegative(lean_object* v_x_17_){
_start:
{
lean_object* v_b_18_; lean_object* v_upper_19_; 
lean_inc_ref(v_x_17_);
v_b_18_ = lp_algalVerification_Algal_Core_RationalBracket_bracket(v_x_17_);
v_upper_19_ = lean_ctor_get(v_b_18_, 0);
lean_inc(v_upper_19_);
if (lean_obj_tag(v_upper_19_) == 0)
{
uint64_t v_lower_20_; 
lean_dec_ref(v_x_17_);
v_lower_20_ = lean_ctor_get_uint64(v_b_18_, sizeof(void*)*2);
lean_dec_ref(v_b_18_);
return v_lower_20_;
}
else
{
uint64_t v_lower_21_; lean_object* v_val_22_; uint64_t v___x_23_; uint64_t v___x_24_; 
v_lower_21_ = lean_ctor_get_uint64(v_b_18_, sizeof(void*)*2);
lean_dec_ref(v_b_18_);
v_val_22_ = lean_ctor_get(v_upper_19_, 0);
lean_inc(v_val_22_);
lean_dec_ref_known(v_upper_19_, 1);
v___x_23_ = lean_unbox_uint64(v_val_22_);
lean_dec(v_val_22_);
v___x_24_ = lp_algalVerification_Algal_Core_RationalSelector_chooseInterior(v_lower_21_, v___x_23_, v_x_17_);
return v___x_24_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalSelector_selectNonnegative___boxed(lean_object* v_x_25_){
_start:
{
uint64_t v_res_26_; lean_object* v_r_27_; 
v_res_26_ = lp_algalVerification_Algal_Core_RationalSelector_selectNonnegative(v_x_25_);
v_r_27_ = lean_box_uint64(v_res_26_);
return v_r_27_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalSelector_signedInput(uint8_t v_s_28_, lean_object* v_magnitude_29_){
_start:
{
if (v_s_28_ == 0)
{
lean_object* v___x_30_; 
v___x_30_ = l_Rat_neg(v_magnitude_29_);
return v___x_30_;
}
else
{
return v_magnitude_29_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalSelector_signedInput___boxed(lean_object* v_s_31_, lean_object* v_magnitude_32_){
_start:
{
uint8_t v_s_boxed_33_; lean_object* v_res_34_; 
v_s_boxed_33_ = lean_unbox(v_s_31_);
v_res_34_ = lp_algalVerification_Algal_Core_RationalSelector_signedInput(v_s_boxed_33_, v_magnitude_32_);
return v_res_34_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RationalSelector_selectSigned(uint8_t v_s_35_, lean_object* v_magnitude_36_){
_start:
{
if (v_s_35_ == 0)
{
uint64_t v___x_37_; uint64_t v___x_38_; 
v___x_37_ = lp_algalVerification_Algal_Core_RationalSelector_selectNonnegative(v_magnitude_36_);
v___x_38_ = lp_algalVerification_Algal_Core_SignedRounding_negateBits(v___x_37_);
return v___x_38_;
}
else
{
uint64_t v___x_39_; 
v___x_39_ = lp_algalVerification_Algal_Core_RationalSelector_selectNonnegative(v_magnitude_36_);
return v___x_39_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RationalSelector_selectSigned___boxed(lean_object* v_s_40_, lean_object* v_magnitude_41_){
_start:
{
uint8_t v_s_boxed_42_; uint64_t v_res_43_; lean_object* v_r_44_; 
v_s_boxed_42_ = lean_unbox(v_s_40_);
v_res_43_ = lp_algalVerification_Algal_Core_RationalSelector_selectSigned(v_s_boxed_42_, v_magnitude_41_);
v_r_44_ = lean_box_uint64(v_res_43_);
return v_r_44_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RationalSelector_0__Algal_Core_RationalSelector_signedInput_match__1_splitter___redArg(uint8_t v_s_45_, lean_object* v_h__1_46_, lean_object* v_h__2_47_){
_start:
{
if (v_s_45_ == 0)
{
lean_object* v___x_48_; lean_object* v___x_49_; 
lean_dec(v_h__1_46_);
v___x_48_ = lean_box(0);
v___x_49_ = lean_apply_1(v_h__2_47_, v___x_48_);
return v___x_49_;
}
else
{
lean_object* v___x_50_; lean_object* v___x_51_; 
lean_dec(v_h__2_47_);
v___x_50_ = lean_box(0);
v___x_51_ = lean_apply_1(v_h__1_46_, v___x_50_);
return v___x_51_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RationalSelector_0__Algal_Core_RationalSelector_signedInput_match__1_splitter___redArg___boxed(lean_object* v_s_52_, lean_object* v_h__1_53_, lean_object* v_h__2_54_){
_start:
{
uint8_t v_s_24__boxed_55_; lean_object* v_res_56_; 
v_s_24__boxed_55_ = lean_unbox(v_s_52_);
v_res_56_ = lp_algalVerification___private_Algal_Core_RationalSelector_0__Algal_Core_RationalSelector_signedInput_match__1_splitter___redArg(v_s_24__boxed_55_, v_h__1_53_, v_h__2_54_);
return v_res_56_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RationalSelector_0__Algal_Core_RationalSelector_signedInput_match__1_splitter(lean_object* v_motive_57_, uint8_t v_s_58_, lean_object* v_h__1_59_, lean_object* v_h__2_60_){
_start:
{
if (v_s_58_ == 0)
{
lean_object* v___x_61_; lean_object* v___x_62_; 
lean_dec(v_h__1_59_);
v___x_61_ = lean_box(0);
v___x_62_ = lean_apply_1(v_h__2_60_, v___x_61_);
return v___x_62_;
}
else
{
lean_object* v___x_63_; lean_object* v___x_64_; 
lean_dec(v_h__2_60_);
v___x_63_ = lean_box(0);
v___x_64_ = lean_apply_1(v_h__1_59_, v___x_63_);
return v___x_64_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RationalSelector_0__Algal_Core_RationalSelector_signedInput_match__1_splitter___boxed(lean_object* v_motive_65_, lean_object* v_s_66_, lean_object* v_h__1_67_, lean_object* v_h__2_68_){
_start:
{
uint8_t v_s_35__boxed_69_; lean_object* v_res_70_; 
v_s_35__boxed_69_ = lean_unbox(v_s_66_);
v_res_70_ = lp_algalVerification___private_Algal_Core_RationalSelector_0__Algal_Core_RationalSelector_signedInput_match__1_splitter(v_motive_65_, v_s_35__boxed_69_, v_h__1_67_, v_h__2_68_);
return v_res_70_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_RationalBracket(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_RationalSelector(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Core_RationalBracket(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
