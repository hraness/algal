// Lean compiler output
// Module: Algal.Core.IntervalSearch
// Imports: public import Init public meta import Init public import Std
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
uint8_t lean_nat_dec_lt(lean_object*, lean_object*);
lean_object* lean_nat_sub(lean_object*, lean_object*);
lean_object* lean_nat_shiftr(lean_object*, lean_object*);
lean_object* lean_nat_add(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_IntervalSearch_cut(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_IntervalSearch_comparisons(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_IntervalSearch_comparisons___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_IntervalSearch_search(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_IntervalSearch_search___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_IntervalSearch_cut(lean_object* v_p_1_, lean_object* v_lo_2_, lean_object* v_hi_3_){
_start:
{
uint8_t v___x_4_; 
v___x_4_ = lean_nat_dec_lt(v_lo_2_, v_hi_3_);
if (v___x_4_ == 0)
{
lean_dec(v_hi_3_);
lean_dec_ref(v_p_1_);
return v_lo_2_;
}
else
{
lean_object* v___x_5_; lean_object* v___x_6_; lean_object* v___x_7_; lean_object* v_mid_8_; lean_object* v___x_9_; uint8_t v___x_10_; 
v___x_5_ = lean_nat_sub(v_hi_3_, v_lo_2_);
v___x_6_ = lean_unsigned_to_nat(1u);
v___x_7_ = lean_nat_shiftr(v___x_5_, v___x_6_);
lean_dec(v___x_5_);
v_mid_8_ = lean_nat_add(v_lo_2_, v___x_7_);
lean_dec(v___x_7_);
lean_inc_ref(v_p_1_);
lean_inc(v_mid_8_);
v___x_9_ = lean_apply_1(v_p_1_, v_mid_8_);
v___x_10_ = lean_unbox(v___x_9_);
if (v___x_10_ == 0)
{
lean_dec(v_hi_3_);
v_hi_3_ = v_mid_8_;
goto _start;
}
else
{
lean_object* v___x_12_; 
lean_dec(v_lo_2_);
v___x_12_ = lean_nat_add(v_mid_8_, v___x_6_);
lean_dec(v_mid_8_);
v_lo_2_ = v___x_12_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_IntervalSearch_comparisons(lean_object* v_p_14_, lean_object* v_lo_15_, lean_object* v_hi_16_){
_start:
{
uint8_t v___x_17_; 
v___x_17_ = lean_nat_dec_lt(v_lo_15_, v_hi_16_);
if (v___x_17_ == 0)
{
lean_object* v___x_18_; 
lean_dec_ref(v_p_14_);
v___x_18_ = lean_unsigned_to_nat(0u);
return v___x_18_;
}
else
{
lean_object* v___x_19_; lean_object* v___x_20_; lean_object* v___x_21_; lean_object* v_mid_22_; lean_object* v___x_23_; uint8_t v___x_24_; 
v___x_19_ = lean_nat_sub(v_hi_16_, v_lo_15_);
v___x_20_ = lean_unsigned_to_nat(1u);
v___x_21_ = lean_nat_shiftr(v___x_19_, v___x_20_);
lean_dec(v___x_19_);
v_mid_22_ = lean_nat_add(v_lo_15_, v___x_21_);
lean_dec(v___x_21_);
lean_inc_ref(v_p_14_);
lean_inc(v_mid_22_);
v___x_23_ = lean_apply_1(v_p_14_, v_mid_22_);
v___x_24_ = lean_unbox(v___x_23_);
if (v___x_24_ == 0)
{
lean_object* v___x_25_; lean_object* v___x_26_; 
v___x_25_ = lp_algalVerification_Algal_Core_IntervalSearch_comparisons(v_p_14_, v_lo_15_, v_mid_22_);
lean_dec(v_mid_22_);
v___x_26_ = lean_nat_add(v___x_20_, v___x_25_);
lean_dec(v___x_25_);
return v___x_26_;
}
else
{
lean_object* v___x_27_; lean_object* v___x_28_; lean_object* v___x_29_; 
v___x_27_ = lean_nat_add(v_mid_22_, v___x_20_);
lean_dec(v_mid_22_);
v___x_28_ = lp_algalVerification_Algal_Core_IntervalSearch_comparisons(v_p_14_, v___x_27_, v_hi_16_);
lean_dec(v___x_27_);
v___x_29_ = lean_nat_add(v___x_20_, v___x_28_);
lean_dec(v___x_28_);
return v___x_29_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_IntervalSearch_comparisons___boxed(lean_object* v_p_30_, lean_object* v_lo_31_, lean_object* v_hi_32_){
_start:
{
lean_object* v_res_33_; 
v_res_33_ = lp_algalVerification_Algal_Core_IntervalSearch_comparisons(v_p_30_, v_lo_31_, v_hi_32_);
lean_dec(v_hi_32_);
lean_dec(v_lo_31_);
return v_res_33_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_IntervalSearch_search(lean_object* v_p_34_, lean_object* v_lo_35_, lean_object* v_hi_36_){
_start:
{
uint8_t v___x_37_; 
v___x_37_ = lean_nat_dec_lt(v_lo_35_, v_hi_36_);
if (v___x_37_ == 0)
{
lean_object* v___x_38_; lean_object* v___x_39_; 
lean_dec_ref(v_p_34_);
v___x_38_ = lean_unsigned_to_nat(0u);
v___x_39_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_39_, 0, v_lo_35_);
lean_ctor_set(v___x_39_, 1, v___x_38_);
return v___x_39_;
}
else
{
lean_object* v___x_40_; lean_object* v___x_41_; lean_object* v___x_42_; lean_object* v_mid_43_; lean_object* v___x_44_; uint8_t v___x_45_; 
v___x_40_ = lean_nat_sub(v_hi_36_, v_lo_35_);
v___x_41_ = lean_unsigned_to_nat(1u);
v___x_42_ = lean_nat_shiftr(v___x_40_, v___x_41_);
lean_dec(v___x_40_);
v_mid_43_ = lean_nat_add(v_lo_35_, v___x_42_);
lean_dec(v___x_42_);
lean_inc_ref(v_p_34_);
lean_inc(v_mid_43_);
v___x_44_ = lean_apply_1(v_p_34_, v_mid_43_);
v___x_45_ = lean_unbox(v___x_44_);
if (v___x_45_ == 0)
{
lean_object* v_child_46_; lean_object* v_fst_47_; lean_object* v_snd_48_; lean_object* v___x_50_; uint8_t v_isShared_51_; uint8_t v_isSharedCheck_56_; 
v_child_46_ = lp_algalVerification_Algal_Core_IntervalSearch_search(v_p_34_, v_lo_35_, v_mid_43_);
lean_dec(v_mid_43_);
v_fst_47_ = lean_ctor_get(v_child_46_, 0);
v_snd_48_ = lean_ctor_get(v_child_46_, 1);
v_isSharedCheck_56_ = !lean_is_exclusive(v_child_46_);
if (v_isSharedCheck_56_ == 0)
{
v___x_50_ = v_child_46_;
v_isShared_51_ = v_isSharedCheck_56_;
goto v_resetjp_49_;
}
else
{
lean_inc(v_snd_48_);
lean_inc(v_fst_47_);
lean_dec(v_child_46_);
v___x_50_ = lean_box(0);
v_isShared_51_ = v_isSharedCheck_56_;
goto v_resetjp_49_;
}
v_resetjp_49_:
{
lean_object* v___x_52_; lean_object* v___x_54_; 
v___x_52_ = lean_nat_add(v___x_41_, v_snd_48_);
lean_dec(v_snd_48_);
if (v_isShared_51_ == 0)
{
lean_ctor_set(v___x_50_, 1, v___x_52_);
v___x_54_ = v___x_50_;
goto v_reusejp_53_;
}
else
{
lean_object* v_reuseFailAlloc_55_; 
v_reuseFailAlloc_55_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_55_, 0, v_fst_47_);
lean_ctor_set(v_reuseFailAlloc_55_, 1, v___x_52_);
v___x_54_ = v_reuseFailAlloc_55_;
goto v_reusejp_53_;
}
v_reusejp_53_:
{
return v___x_54_;
}
}
}
else
{
lean_object* v___x_57_; lean_object* v_child_58_; lean_object* v_fst_59_; lean_object* v_snd_60_; lean_object* v___x_62_; uint8_t v_isShared_63_; uint8_t v_isSharedCheck_68_; 
lean_dec(v_lo_35_);
v___x_57_ = lean_nat_add(v_mid_43_, v___x_41_);
lean_dec(v_mid_43_);
v_child_58_ = lp_algalVerification_Algal_Core_IntervalSearch_search(v_p_34_, v___x_57_, v_hi_36_);
v_fst_59_ = lean_ctor_get(v_child_58_, 0);
v_snd_60_ = lean_ctor_get(v_child_58_, 1);
v_isSharedCheck_68_ = !lean_is_exclusive(v_child_58_);
if (v_isSharedCheck_68_ == 0)
{
v___x_62_ = v_child_58_;
v_isShared_63_ = v_isSharedCheck_68_;
goto v_resetjp_61_;
}
else
{
lean_inc(v_snd_60_);
lean_inc(v_fst_59_);
lean_dec(v_child_58_);
v___x_62_ = lean_box(0);
v_isShared_63_ = v_isSharedCheck_68_;
goto v_resetjp_61_;
}
v_resetjp_61_:
{
lean_object* v___x_64_; lean_object* v___x_66_; 
v___x_64_ = lean_nat_add(v___x_41_, v_snd_60_);
lean_dec(v_snd_60_);
if (v_isShared_63_ == 0)
{
lean_ctor_set(v___x_62_, 1, v___x_64_);
v___x_66_ = v___x_62_;
goto v_reusejp_65_;
}
else
{
lean_object* v_reuseFailAlloc_67_; 
v_reuseFailAlloc_67_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_67_, 0, v_fst_59_);
lean_ctor_set(v_reuseFailAlloc_67_, 1, v___x_64_);
v___x_66_ = v_reuseFailAlloc_67_;
goto v_reusejp_65_;
}
v_reusejp_65_:
{
return v___x_66_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_IntervalSearch_search___boxed(lean_object* v_p_69_, lean_object* v_lo_70_, lean_object* v_hi_71_){
_start:
{
lean_object* v_res_72_; 
v_res_72_ = lp_algalVerification_Algal_Core_IntervalSearch_search(v_p_69_, v_lo_70_, v_hi_71_);
lean_dec(v_hi_71_);
return v_res_72_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Std(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_IntervalSearch(uint8_t builtin) {
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
res = initialize_Std(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
