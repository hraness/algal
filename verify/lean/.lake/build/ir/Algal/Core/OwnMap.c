// Lean compiler output
// Module: Algal.Core.OwnMap
// Imports: public import Init public meta import Init public import Init
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
uint8_t lean_string_dec_eq(lean_object*, lean_object*);
lean_object* l_List_reverse___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_lookup___redArg___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_lookup(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_lookup___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_write___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_write(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_fromParsedEntries___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_fromParsedEntries(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_OwnMap_0__Algal_Core_OwnMap_lookup_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_OwnMap_0__Algal_Core_OwnMap_lookup_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(lean_object* v_x_1_, lean_object* v_x_2_){
_start:
{
if (lean_obj_tag(v_x_1_) == 0)
{
lean_object* v___x_3_; 
v___x_3_ = lean_box(0);
return v___x_3_;
}
else
{
lean_object* v_head_4_; lean_object* v_tail_5_; lean_object* v_fst_6_; lean_object* v_snd_7_; uint8_t v___x_8_; 
v_head_4_ = lean_ctor_get(v_x_1_, 0);
v_tail_5_ = lean_ctor_get(v_x_1_, 1);
v_fst_6_ = lean_ctor_get(v_head_4_, 0);
v_snd_7_ = lean_ctor_get(v_head_4_, 1);
v___x_8_ = lean_string_dec_eq(v_x_2_, v_fst_6_);
if (v___x_8_ == 0)
{
v_x_1_ = v_tail_5_;
goto _start;
}
else
{
lean_object* v___x_10_; 
lean_inc(v_snd_7_);
v___x_10_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_10_, 0, v_snd_7_);
return v___x_10_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_lookup___redArg___boxed(lean_object* v_x_11_, lean_object* v_x_12_){
_start:
{
lean_object* v_res_13_; 
v_res_13_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_x_11_, v_x_12_);
lean_dec_ref(v_x_12_);
lean_dec(v_x_11_);
return v_res_13_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_lookup(lean_object* v_00_u03b1_14_, lean_object* v_x_15_, lean_object* v_x_16_){
_start:
{
lean_object* v___x_17_; 
v___x_17_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_x_15_, v_x_16_);
return v___x_17_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_lookup___boxed(lean_object* v_00_u03b1_18_, lean_object* v_x_19_, lean_object* v_x_20_){
_start:
{
lean_object* v_res_21_; 
v_res_21_ = lp_algalVerification_Algal_Core_OwnMap_lookup(v_00_u03b1_18_, v_x_19_, v_x_20_);
lean_dec_ref(v_x_20_);
lean_dec(v_x_19_);
return v_res_21_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_write___redArg(lean_object* v_entries_22_, lean_object* v_key_23_, lean_object* v_value_24_){
_start:
{
lean_object* v___x_25_; lean_object* v___x_26_; 
v___x_25_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_25_, 0, v_key_23_);
lean_ctor_set(v___x_25_, 1, v_value_24_);
v___x_26_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_26_, 0, v___x_25_);
lean_ctor_set(v___x_26_, 1, v_entries_22_);
return v___x_26_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_write(lean_object* v_00_u03b1_27_, lean_object* v_entries_28_, lean_object* v_key_29_, lean_object* v_value_30_){
_start:
{
lean_object* v___x_31_; 
v___x_31_ = lp_algalVerification_Algal_Core_OwnMap_write___redArg(v_entries_28_, v_key_29_, v_value_30_);
return v___x_31_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_fromParsedEntries___redArg(lean_object* v_entries_32_){
_start:
{
lean_object* v___x_33_; 
v___x_33_ = l_List_reverse___redArg(v_entries_32_);
return v___x_33_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_OwnMap_fromParsedEntries(lean_object* v_00_u03b1_34_, lean_object* v_entries_35_){
_start:
{
lean_object* v___x_36_; 
v___x_36_ = l_List_reverse___redArg(v_entries_35_);
return v___x_36_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_OwnMap_0__Algal_Core_OwnMap_lookup_match__1_splitter___redArg(lean_object* v_x_37_, lean_object* v_x_38_, lean_object* v_h__1_39_, lean_object* v_h__2_40_){
_start:
{
if (lean_obj_tag(v_x_37_) == 0)
{
lean_object* v___x_41_; 
lean_dec(v_h__2_40_);
v___x_41_ = lean_apply_1(v_h__1_39_, v_x_38_);
return v___x_41_;
}
else
{
lean_object* v_head_42_; lean_object* v_tail_43_; lean_object* v_fst_44_; lean_object* v_snd_45_; lean_object* v___x_46_; 
lean_dec(v_h__1_39_);
v_head_42_ = lean_ctor_get(v_x_37_, 0);
lean_inc(v_head_42_);
v_tail_43_ = lean_ctor_get(v_x_37_, 1);
lean_inc(v_tail_43_);
lean_dec_ref_known(v_x_37_, 2);
v_fst_44_ = lean_ctor_get(v_head_42_, 0);
lean_inc(v_fst_44_);
v_snd_45_ = lean_ctor_get(v_head_42_, 1);
lean_inc(v_snd_45_);
lean_dec(v_head_42_);
v___x_46_ = lean_apply_4(v_h__2_40_, v_fst_44_, v_snd_45_, v_tail_43_, v_x_38_);
return v___x_46_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_OwnMap_0__Algal_Core_OwnMap_lookup_match__1_splitter(lean_object* v_00_u03b1_47_, lean_object* v_motive_48_, lean_object* v_x_49_, lean_object* v_x_50_, lean_object* v_h__1_51_, lean_object* v_h__2_52_){
_start:
{
if (lean_obj_tag(v_x_49_) == 0)
{
lean_object* v___x_53_; 
lean_dec(v_h__2_52_);
v___x_53_ = lean_apply_1(v_h__1_51_, v_x_50_);
return v___x_53_;
}
else
{
lean_object* v_head_54_; lean_object* v_tail_55_; lean_object* v_fst_56_; lean_object* v_snd_57_; lean_object* v___x_58_; 
lean_dec(v_h__1_51_);
v_head_54_ = lean_ctor_get(v_x_49_, 0);
lean_inc(v_head_54_);
v_tail_55_ = lean_ctor_get(v_x_49_, 1);
lean_inc(v_tail_55_);
lean_dec_ref_known(v_x_49_, 2);
v_fst_56_ = lean_ctor_get(v_head_54_, 0);
lean_inc(v_fst_56_);
v_snd_57_ = lean_ctor_get(v_head_54_, 1);
lean_inc(v_snd_57_);
lean_dec(v_head_54_);
v___x_58_ = lean_apply_4(v_h__2_52_, v_fst_56_, v_snd_57_, v_tail_55_, v_x_50_);
return v___x_58_;
}
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_OwnMap(uint8_t builtin) {
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
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
